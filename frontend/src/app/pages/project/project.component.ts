import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TimerService, formatDuration } from '../../core/timer.service';
import { Project, TaskList, Task, TeamMember, TimeEntry, Comment } from '../../core/models';
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
  tasksByList: Record<number, Task[]> = {};
  members: TeamMember[] = [];
  isAdmin = false;
  showNewList = false;
  viewMode: 'board' | 'list' = 'board';
  showOnlyMyTasks = false;
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
  newTaskAssignees: number[] = [];
  selectedTask: (Task & { comments?: Comment[] }) | null = null;
  editTitle = '';
  editDescription = '';
  editStatus = 'todo';
  editPriority = 'medium';
  editDueDate = '';
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

  getTasksForList(listId: number): Task[] {
    const tasks = this.tasksByList[listId] || [];

    if (!this.showOnlyMyTasks) {
      return tasks;
    }
    const userId = this.currentUserId;
    return tasks.filter(task =>
      task.assigneeIds?.includes(userId!)
    );
  }


  get currentUserId(): number | undefined{
    return this.auth.currentUser()?.id;
  }

  get canTrackTime(): boolean {
    if (!this.selectedTask) return false;
    const uid = this.auth.currentUser()?.id;
    return !!uid && this.selectedTask.assigneeIds.includes(uid);
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
      this.api.getTeams().subscribe(teams => {
        const t = teams.find(x => x.id === p.team_id);
        this.isAdmin = t?.role === 'admin';
      
        this.showOnlyMyTasks = !this.isAdmin;
      });
    });
    this.loadBoard(projectId);
    this.timer.refresh();
    
  }

  loadBoard(projectId: number) {
    this.api.getTaskLists(projectId).subscribe(lists => {
      this.lists = lists;
      for (const list of lists) {
        this.api.getTasks(list.id).subscribe(tasks => {
          this.tasksByList[list.id] = tasks;
        });
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
      } else if (this.listFilterDueDate && !task.due_date) {
        matchesDueDate = false;
      }
      return matchesMyTasks && matchesList && matchesStatus && matchesPriority && matchesSearch && matchesDueDate;
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
  }

  toggleNewAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.newTaskAssignees = [...this.newTaskAssignees, id];
    else this.newTaskAssignees = this.newTaskAssignees.filter(x => x !== id);
  }

  createTask() {
    if (!this.newTaskTitle.trim()) return;
    this.api.createTask({
      taskListId: this.newTaskListId,
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      priority: this.newTaskPriority as Task['priority'],
      dueDate: this.newTaskDueDate || null,
      assigneeIds: this.newTaskAssignees,
    }).subscribe(task => {
      const listId = this.newTaskListId;
      this.tasksByList[listId] = [task, ...(this.tasksByList[listId] || [])];
      this.showNewTaskForm = false;
      this.newTaskTitle = '';
      this.newTaskDescription = '';
      this.newTaskDueDate = '';
      this.newTaskAssignees = [];
    });
  }

  openTask(taskId: number) {
    this.api.getTask(taskId).subscribe(task => {
      this.selectedTask = task;
      this.editTitle = task.title;
      this.editDescription = task.description;
      this.editStatus = task.status;
      this.editPriority = task.priority;
      this.editDueDate = task.due_date?.slice(0, 10) || '';
      this.editAssignees = [...task.assigneeIds];
      this.resetRecurrenceForm();
      this.api.getTaskTimeEntries(taskId).subscribe(e => this.timeEntries = e);
    });
  }

  closeTask() { this.selectedTask = null; }

  toggleAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.editAssignees = [...this.editAssignees, id];
    else this.editAssignees = this.editAssignees.filter(x => x !== id);
  }

  saveTask() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, {
      title: this.editTitle,
      description: this.editDescription,
      status: this.editStatus as Task['status'],
      priority: this.editPriority as Task['priority'],
      dueDate: this.editDueDate || null,
      assigneeIds: this.editAssignees,
    }).subscribe(updated => {
      this.refreshTaskInBoard(updated);
      this.selectedTask = { ...this.selectedTask!, ...updated, assigneeIds: this.editAssignees };
      this.closeTask();
    });
  }

  saveStatusOnly() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, { status: this.editStatus as Task['status'] })
      .subscribe(updated => this.refreshTaskInBoard(updated));
  }

  resetRecurrenceForm() {
    this.recurrenceRuleType = 'fixed_day';
    this.recurrenceFrequency = 'daily';
    this.recurrenceInterval = 1;
    this.recurrenceWeekday = 'monday';
    this.recurrenceDayOfMonth = 1;
    this.recurrenceMonthOfYear = 1;
    this.recurrenceStartDate = this.editDueDate;
    this.recurrenceEndDate = '';
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
    if (this.recurrenceFrequency === 'monthly') {
      payload['day_of_month'] = this.recurrenceDayOfMonth;
    }
    if (this.recurrenceFrequency === 'yearly') {
      payload['day_of_month'] = this.recurrenceDayOfMonth;
      payload['month_of_year'] = this.recurrenceMonthOfYear;
    }

    this.api.createRecurrence(this.selectedTask.id, payload).subscribe({
      next: () => {
        this.recurrenceMessage = 'Recorrência criada com sucesso.';
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
    if (task.status === 'done') {
      this.tasksByList[listId] = arr.filter(t => t.id !== task.id);
    } else {
      this.tasksByList[listId] = arr.map(t => t.id === task.id ? { ...t, ...task } : t);
    }
  }

  startTimer() {
    if (!this.selectedTask) return;
    this.timer.start(this.selectedTask.id);
  }

  stopTimer() {
    this.timer.stop();
    if (this.selectedTask) {
      this.api.getTaskTimeEntries(this.selectedTask.id).subscribe(e => this.timeEntries = e);
    }
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
