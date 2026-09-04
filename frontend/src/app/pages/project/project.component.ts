import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TimerService, formatDuration } from '../../core/timer.service';
import { Project, TaskList, Task, TeamMember, TimeEntry, Comment, RecurrenceRule, Client, TaskDependency, DependencyType } from '../../core/models';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [FormsModule, RouterLink,MatCheckboxModule],
  styleUrls: ['./project.component.css'],
  templateUrl: './project.component.html',
  })

export class ProjectComponent implements OnInit {
  project: Project | null = null;
  lists: TaskList[] = [];
  clients: Client[] = [];
  clientId: number | null = null;
  tasksByList: Record<number, Task[]> = {};
  members: TeamMember[] = [];
  isAdmin = false;
  showNewList = false;
  viewMode: 'board' | 'list' = 'board';
  showOnlyMyTasks = false;
  showOpenTasksOnly = true;
  listSearch = '';
  listFilterList = '';
  listFilterStatus = '';
  listFilterPriority = '';
  listFilterDueDate = '';
  listPage = 1;
  listPageSize = 10;
  newListName = '';
  showNewTaskForm = false;
  newTaskListId = 0;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskPriority = 'medium';
  newTaskDueDate = '';
  alertDate = '';
  newTaskAssignees: number[] = [];
  selectedTask: (Task & { comments?: Comment[] }) | null = null;
  editTitle = '';
  editDescription = '';
  editStatus = 'todo';
  editPriority = 'medium';
  editDueDate = '';
  editAlertDate = '';
  editAssignees: number[] = [];
  newComment = '';
  timeEntries: TimeEntry[] = [];
  fmt = formatDuration;
  selectedFile: File | null = null;
  selectedFileName = '';
  recurrenceRuleType = 'fixed_day';
  recurrenceFrequency = 'daily';
  recurrenceInterval = 1;
  recurrenceWeekday = 'monday';
  recurrenceDayOfMonth = 1;
  recurrenceMonthOfYear = 1;
  recurrenceStartDate = '';
  recurrenceEndDate = '';
  recurrenceMessage = '';
  editDocsUrl='';
  docsUrlError = '';
  recurrenceRule: RecurrenceRule | null = null;
  taskDependencies: TaskDependency[] = [];
  newTaskDependencies: TaskDependency[] = [];
  dependencySearch = '';
  selectedPredecessor: Task | null = null;
  dependencyType: DependencyType = 'FF';
  dependencyError = '';
  saveError = '';
  blockingPredecessorId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    public timer: TimerService,
    private http: HttpClient
  ) {

  }
  
  toggleTaskFilter(event: MatCheckboxChange) {
    if (this.isAdmin) {
      this.showOnlyMyTasks = event.checked;
    } else {
      this.showOnlyMyTasks = !event.checked;
    }
  }
  
  toggleOpenTasksFilter(event: MatCheckboxChange) {
    this.showOpenTasksOnly = event.checked;
  }
  
  getTasksForList(listId: number): Task[] {
    const tasks = this.tasksByList[listId] || [];
    const userId = this.currentUserId;

    return tasks.filter(task => {
      if (this.showOnlyMyTasks && !task.assigneeIds?.includes(userId!)) return false;
      if (this.showOpenTasksOnly && task.status === 'done') return false;
      return true;
    });
  }

  get currentUserId(): number | undefined{
    return this.auth.currentUser()?.id;
  }

  get canTrackTime(): boolean {
    if (!this.selectedTask) return false;
    const uid = this.auth.currentUser()?.id;
    return !!uid && this.selectedTask.assigneeIds.includes(uid);
  }

  get canChangeStatus(): boolean {
    return this.isAdmin || this.canTrackTime;
  }

  get activeOnThisTask(): boolean {
    const active = this.timer.activeEntry();
    return !!active && active.task_id === this.selectedTask?.id;
  }

  ngOnInit() {
    const projectId = +this.route.snapshot.paramMap.get('id')!;
    this.api.getProject(projectId).subscribe(p => {
      this.project = p;
      this.api.getTeams().subscribe(teams => {
        const t = teams.find(x => x.id === p.team_id);
        this.isAdmin = t?.role === 'admin';
      });
      this.api.getTeamMembers(p.team_id).subscribe(m => this.members = m);
    });
    this.loadBoard(projectId);
    this.timer.refresh();
    this.api.getClients().subscribe(data=>{
      this.clients=data
    })
  }

  loadBoard(projectId: number) {
    this.api.getTaskLists(projectId).subscribe(lists => {
      this.lists = lists;
      for (const list of lists) {
        this.api.getTasks(list.id).subscribe(tasks => {
          this.tasksByList[list.id] = tasks;
        });
        console.log(this.tasksByList);
      }
    });
  }

  statusLabel(s: string) {
    return { todo: 'Por fazer', doing: 'Em progresso', done: 'Concluída' }[s] || s;
  }

  get listViewTasks(): Array<{ task: Task; listName: string }> {
    const rows: Array<{ task: Task; listName: string }> = [];
    for (const list of this.lists) {
      for (const task of this.tasksByList[list.id] || []) {
        rows.push({ task, listName: list.name });
      }
    }
    return rows;
  }

  get filteredListViewTasks(): Array<{ task: Task; listName: string }> {
    const search = this.listSearch.trim().toLowerCase();
    return this.listViewTasks.filter(({ task, listName }) => {
      
      const userId = this.currentUserId;
      const matchesMyTasks =!this.showOnlyMyTasks ||task.assigneeIds?.includes(userId!);
      const matchesOpenTasks = !this.showOpenTasksOnly || task.status !== 'done';
      const matchesList = !this.listFilterList || this.listFilterList === String(task.task_list_id);
      const matchesStatus = !this.listFilterStatus || task.status === this.listFilterStatus;
      const matchesPriority = !this.listFilterPriority || task.priority === this.listFilterPriority;
      const matchesSearch = !search || task.title.toLowerCase().includes(search) || listName.toLowerCase().includes(search);

      let matchesDueDate = true;
      if (this.listFilterDueDate && task.due_date) {
        const due = new Date(task.due_date);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        if (this.listFilterDueDate === 'today') {
          matchesDueDate = due >= startOfToday && due < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        } else if (this.listFilterDueDate === 'week') {
          matchesDueDate = due >= startOfWeek && due < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (this.listFilterDueDate === 'overdue') {
          matchesDueDate = due < startOfToday;
        }
      }else if (this.listFilterDueDate && !task.due_date) {
        matchesDueDate = false;
      }
      return matchesMyTasks && matchesOpenTasks && matchesList && matchesStatus && matchesPriority && matchesSearch && matchesDueDate;
    });
  }

  get totalListPages(): number {
    return Math.max(1, Math.ceil(this.filteredListViewTasks.length / this.listPageSize));
  }

  get pagedListViewTasks(): Array<{ task: Task; listName: string }> {
    const start = (this.listPage - 1) * this.listPageSize;
    return this.filteredListViewTasks.slice(start, start + this.listPageSize);
  }

  formatDate(value: string | null) {
    if (!value) return 'Sem prazo';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem prazo';
    return date.toLocaleDateString('pt-PT');
  }

  createList() {
    if (!this.project || !this.newListName.trim()) return;
    this.api.createTaskList(this.project.id, this.newListName.trim()).subscribe(list => {
      this.lists = [...this.lists, list];
      this.tasksByList[list.id] = [];
      this.newListName = '';
      this.showNewList = false;
    });
  }

  openNewTask(listId: number) {
    this.newTaskListId = listId;
    this.showNewTaskForm = true;
    this.newTaskDependencies = [];
    this.resetDependencyPicker();
  }

  toggleNewAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.newTaskAssignees = [...this.newTaskAssignees, id];
    else this.newTaskAssignees = this.newTaskAssignees.filter(x => x !== id);
  }

  createTask() {
    if (!this.newTaskTitle.trim()) return;
    this.dependencyError = '';
    const pendingDeps = [...this.newTaskDependencies];
    this.api.createTask({
      taskListId: this.newTaskListId,
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      priority: this.newTaskPriority as Task['priority'],
      dueDate: this.newTaskDueDate || null,
      alertDate: this.alertDate || null,
      assigneeIds: this.newTaskAssignees,
    }).pipe(
      switchMap(task => {
        if (!pendingDeps.length) return of(task);
        return forkJoin(
          pendingDeps.map(dep =>
            this.api.createDependency(task.id, dep.predecessor, dep.dependency_type)
          )
        ).pipe(switchMap(() => of(task)));
      })
    ).subscribe({
      next: task => {
        const listId = this.newTaskListId;
        this.tasksByList[listId] = [task, ...(this.tasksByList[listId] || [])];
        this.showNewTaskForm = false;
        this.newTaskTitle = '';
        this.newTaskDescription = '';
        this.newTaskDueDate = '';
        this.alertDate = '';
        this.newTaskAssignees = [];
        this.newTaskDependencies = [];
        this.resetDependencyPicker();
      },
      error: err => {
        this.dependencyError = err.error?.error || 'Não foi possível criar a tarefa ou as dependências';
      }
    });
  }

  openTask(taskId: number) {
    this.saveError = '';
    this.blockingPredecessorId = null;
    this.resetDependencyPicker();
    this.api.getTask(taskId).subscribe(task => {
      this.selectedTask = task;
      this.editTitle = task.title;
      this.editDescription = task.description;
      this.editStatus = task.status;
      this.editPriority = task.priority;
      this.editDueDate = task.due_date?.slice(0, 10) || '';
      this.editAlertDate = task.next_alert_date?.slice(0,10) || '';
      this.editDocsUrl = task.docs_url || '';
      this.docsUrlError = '';
      this.editAssignees = [...task.assigneeIds];
      this.clientId = task.client_id ?? null;
      this.taskDependencies = task.dependencies || [];
      this.resetRecurrenceForm(task.recurrence);
      this.api.getTaskTimeEntries(taskId).subscribe(e => this.timeEntries = e);
    });
  }

  closeTask() {
    this.selectedTask = null;
    this.clientId = null;
    this.taskDependencies = [];
    this.saveError = '';
    this.blockingPredecessorId = null;
    this.resetDependencyPicker();
  }

  toggleAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.editAssignees = [...this.editAssignees, id];
    else this.editAssignees = this.editAssignees.filter(x => x !== id);
  }

  saveTask() {
    if (!this.selectedTask) return;
    const docsUrl = this.normalizeDocsUrl(this.editDocsUrl);
    if (docsUrl === false) {
      this.docsUrlError = 'Indique um URL válido, por exemplo https://exemplo.com';
      return;
    }
    this.docsUrlError = '';
    this.editDocsUrl = docsUrl;
    this.saveError = '';
    this.blockingPredecessorId = null;
    this.api.updateTask(this.selectedTask.id, {
      title: this.editTitle,
      description: this.editDescription,
      status: this.editStatus as Task['status'],
      priority: this.editPriority as Task['priority'],
      dueDate: this.editDueDate || null,
      next_alert_date: this.editAlertDate || null,
      assigneeIds: this.editAssignees,
      clientId: this.clientId,
      docs_url: docsUrl,
    }).subscribe({
      next: updated => {
        this.refreshTaskInBoard(updated);
        this.selectedTask = { ...this.selectedTask!, ...updated, assigneeIds: this.editAssignees };
        this.closeTask();
      },
      error: err => {
        this.saveError = err.error?.error || 'Não foi possível guardar a tarefa';
        this.blockingPredecessorId = err.error?.blockingDependency?.predecessor ?? null;
        this.revealSaveError();
      }
    });
  }

  onDocsUrlChange() {
    this.docsUrlError = '';
  }

  private normalizeDocsUrl(value: string): string | false {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(withProtocol);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
      if (url.hostname !== 'localhost' && !url.hostname.includes('.')) return false;
      return url.toString();
    } catch {
      return false;
    }
  }

  saveStatusOnly() {
    if (!this.selectedTask) return;
    this.saveError = '';
    this.blockingPredecessorId = null;
    this.api.updateTask(this.selectedTask.id, { status: this.editStatus as Task['status'] })
      .subscribe({
        next: updated => this.refreshTaskInBoard(updated),
        error: err => {
          this.saveError = err.error?.error || 'Não foi possível alterar o estado';
          this.blockingPredecessorId = err.error?.blockingDependency?.predecessor ?? null;
          this.editStatus = this.selectedTask?.status || this.editStatus;
          this.revealSaveError();
        }
      });
  }

  private revealSaveError() {
    setTimeout(() => {
      const target = document.querySelector('.error-banner-actions');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  get currentDependencies(): TaskDependency[] {
    return this.selectedTask ? this.taskDependencies : this.newTaskDependencies;
  }

  get filteredPredecessorTasks(): Task[] {
    const search = this.dependencySearch.trim().toLowerCase();
    if (!search || this.selectedPredecessor) return [];
    const currentId = this.selectedTask?.id;
    const results: Task[] = [];
    for (const list of this.lists) {
      for (const task of this.tasksByList[list.id] || []) {
        if (task.id === currentId) continue;
        if (!task.title.toLowerCase().includes(search)) continue;
        results.push(task);
        if (results.length >= 8) return results;
      }
    }
    return results;
  }

  dependencyTypeLabel(type: string) {
    return {
      FS: 'FS — Finish to Start',
      SS: 'SS — Start to Start',
      FF: 'FF — Finish to Finish',
      SF: 'SF — Start to Finish',
    }[type] || type;
  }

  selectPredecessor(task: Task) {
    this.selectedPredecessor = task;
    this.dependencySearch = task.title;
    this.dependencyError = '';
  }

  onDependencySearchChange() {
    if (this.selectedPredecessor && this.dependencySearch !== this.selectedPredecessor.title) {
      this.selectedPredecessor = null;
    }
    this.dependencyError = '';
  }

  resetDependencyPicker() {
    this.dependencySearch = '';
    this.selectedPredecessor = null;
    this.dependencyType = 'FF';
    this.dependencyError = '';
  }

  addDependency() {
    if (!this.selectedPredecessor) {
      this.dependencyError = 'Pesquise e selecione uma tarefa predecessora';
      return;
    }
    const predecessor = this.selectedPredecessor;
    const type = this.dependencyType;

    if (this.selectedTask) {
      const existing = this.taskDependencies.find(d => d.predecessor === predecessor.id);
      const request = existing
        ? this.api.updateDependency(this.selectedTask.id, predecessor.id, type)
        : this.api.createDependency(this.selectedTask.id, predecessor.id, type);

      request.subscribe({
        next: dep => {
          if (existing) {
            this.taskDependencies = this.taskDependencies.map(d =>
              d.predecessor === dep.predecessor ? { ...d, ...dep } : d
            );
          } else {
            this.taskDependencies = [...this.taskDependencies, dep];
          }
          this.resetDependencyPicker();
        },
        error: err => {
          this.dependencyError = err.error?.error || 'Não foi possível guardar a dependência';
        }
      });
      return;
    }

    const item: TaskDependency = {
      predecessor: predecessor.id,
      successor: 0,
      dependency_type: type,
      predecessor_title: predecessor.title,
    };
    const existing = this.newTaskDependencies.find(d => d.predecessor === predecessor.id);
    this.newTaskDependencies = existing
      ? this.newTaskDependencies.map(d => d.predecessor === item.predecessor ? item : d)
      : [...this.newTaskDependencies, item];
    this.resetDependencyPicker();
  }

  resetRecurrenceForm(rule: RecurrenceRule | null = null) {
    this.recurrenceRule = rule;
    this.recurrenceRuleType = rule?.rule_type || 'fixed_day';
    this.recurrenceFrequency = rule?.frequency || 'daily';
    this.recurrenceInterval = rule?.interval || 1;
    this.recurrenceWeekday = rule?.weekday || 'monday';
    this.recurrenceDayOfMonth = rule?.day_of_month || 1;
    this.recurrenceMonthOfYear = rule?.month_of_year || 1;
    this.recurrenceStartDate = this.editDueDate;
    this.recurrenceEndDate = rule?.end_date?.slice(0, 10) || '';
    this.recurrenceMessage = '';
  }

  createRecurrence() {
    if (!this.selectedTask) return;

    const payload: Record<string, unknown> = {
      frequency: this.recurrenceFrequency,
      interval: this.recurrenceInterval,
      start_date: this.recurrenceStartDate || this.editDueDate || null,
      end_date: this.recurrenceEndDate || null,
      rule_type: this.recurrenceRuleType,
    };

    if (this.recurrenceFrequency === 'weekly') {
      payload['weekday'] = this.recurrenceWeekday;
    }
    const request = this.recurrenceRule
      ? this.api.updateRecurrence(this.selectedTask.id, payload)
      : this.api.createRecurrence(this.selectedTask.id, payload);
    request.subscribe({
      next: (response) => {
        this.recurrenceRule = (response as { recurrence?: RecurrenceRule }).recurrence || this.recurrenceRule;
        this.recurrenceMessage = this.recurrenceRule
          ? 'Recorrência atualizada com sucesso.'
          : 'Recorrência criada com sucesso.';
        if (this.selectedTask) {
          this.selectedTask = { ...this.selectedTask, recurrence: this.recurrenceRule };
        }
      },
      error: (err) => {
        this.recurrenceMessage = err?.error?.message || 'Não foi possível criar a recorrência.';
      }
    });
  }

  deleteTask() {
    if (!this.selectedTask || !confirm('Eliminar esta tarefa?')) return;
    const id = this.selectedTask.id;
    const listId = this.selectedTask.task_list_id;
    this.api.deleteTask(id).subscribe(() => {
      this.tasksByList[listId] = (this.tasksByList[listId] || []).filter(t => t.id !== id);
      this.closeTask();
    });
  }

  refreshTaskInBoard(task: Task) {
    const listId = task.task_list_id;
    const arr = this.tasksByList[listId] || [];
    const exists = arr.some(t => t.id === task.id);
    this.tasksByList[listId] = exists
      ? arr.map(t => t.id === task.id ? { ...t, ...task } : t)
      : [{ ...task }, ...arr];
  }

  startTimer() {
    if (!this.selectedTask) return;
    this.timer.start(this.selectedTask.id);
  }

  stopTimer() {
    this.timer.stop().subscribe(() => {
      if (this.selectedTask) {
        this.api.getTaskTimeEntries(this.selectedTask.id).subscribe(e => this.timeEntries = e);
      }
    });
  }

  postComment() {
    if (!this.selectedTask || !this.newComment.trim()) return;
    this.api.addComment(this.selectedTask.id, this.newComment.trim()).subscribe((c: Comment) => {
      this.selectedTask!.comments = [...(this.selectedTask!.comments || []), c];
      this.newComment = '';
    });
  }

  deleteComment(commentId: number) {
    if (!this.selectedTask || !confirm('Eliminar este comentário?')) return;
    this.api.deleteComment(this.selectedTask.id, commentId).subscribe(() => {
      this.selectedTask!.comments = (this.selectedTask!.comments || []).filter(c => c.id !== commentId);
    });
  }


  deleteList(listId: number) {
    if (confirm('Tem a certeza que quer eliminar esta lista?')) {
      this.api.deleteTaskList(listId).subscribe(() => {
        this.lists = this.lists.filter(l => l.id !== listId);
        delete this.tasksByList[listId];
      });
    }
  }

  deleteProject() {
    if (!this.project || !confirm('Tem a certeza que quer eliminar este projeto? Esta ação é irreversível.')) return;
    this.api.deleteProject(this.project.id).subscribe(() => {
      window.location.href = `/teams/${this.project!.team_id}`;
    });
  }

  onFileSelected(event: any) {
    const target: DataTransfer = <DataTransfer>event.target;
    if (!target.files || target.files.length !== 1) {
      this.selectedFile = null;
      this.selectedFileName = '';
      return;
    }
    this.selectedFile = target.files[0];
    this.selectedFileName = this.selectedFile.name;
  }

  submitExcel() {
    if (!this.selectedFile || !this.project) return;
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const binaryStr: string = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        this.http.post(
          `${environment.apiUrl}/import/${this.project?.team_id}/${this.project?.id}`,
          data
        ).subscribe({
          next: () => {
            console.log(`Importação da folha "${sheetName}" concluída.`);
            this.selectedFile = null;
            this.selectedFileName = '';
            this.reloadBoard();
          },
          error: err => {
            console.error(`Erro ao importar a folha "${sheetName}"`, err);
          }
        });
      });
    };

    reader.readAsBinaryString(this.selectedFile);
  }

  reloadBoard() {
    if (!this.project) return;
    this.loadBoard(this.project.id);
  }
}
