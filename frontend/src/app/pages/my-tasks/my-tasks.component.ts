import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TimerService, formatDuration } from '../../core/timer.service';
import { Comment, Task, Task_proj, TeamMember, TimeEntry } from '../../core/models';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './my-tasks.component.html',
  styleUrl: './my-tasks.component.css'
})
export class MyTasksComponent implements OnInit {
  tasks: Task_proj[] = [];
  selectedTask: (Task & { project_id?: number; project_name?: string; task_list_name?: string; comments?: Comment[] }) | null = null;
  members: TeamMember[] = [];
  isAdmin = false;
  editTitle = '';
  editDescription = '';
  editStatus: Task['status'] = 'todo';
  editPriority: Task['priority'] = 'medium';
  editDueDate = '';
  editAssignees: number[] = [];
  newComment = '';
  timeEntries: TimeEntry[] = [];
  fmt = formatDuration;
  recurrenceRuleType = 'fixed_day';
  recurrenceFrequency = 'daily';
  recurrenceInterval = 1;
  recurrenceWeekday = 'monday';
  recurrenceDayOfMonth = 1;
  recurrenceMonthOfYear = 1;
  recurrenceStartDate = '';
  recurrenceEndDate = '';
  recurrenceMessage = '';

  search = '';
  filterProject = '';
  filterList = '';
  filterStatus = '';
  filterPriority = '';
  filterDueDate = '';
  page = 1;
  pageSize = 10;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    public timer: TimerService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.timer.refresh();
  }

  loadTasks() {
    this.api.getUserTasks().subscribe(tasks => {
      this.tasks = tasks;
      this.page = 1;
    });
  }

  get projects() {
    return [...new Map(this.tasks.map(task => [task.project_id, task.project_name])).entries()];
  }

  get lists() {
    return [...new Map(this.tasks.map(task => [task.task_list_id, task.task_list_name])).entries()];
  }

  get filteredTasks(): Task_proj[] {
    const search = this.search.trim().toLowerCase();
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startWeek = new Date(startToday);
    startWeek.setDate(startToday.getDate() - startToday.getDay());
    return this.tasks.filter(task => {
      const due = task.due_date ? new Date(task.due_date) : null;
      const matchesSearch = !search ||
        task.title.toLowerCase().includes(search) ||
        task.project_name.toLowerCase().includes(search) ||
        task.task_list_name.toLowerCase().includes(search);
      const matchesDue = !this.filterDueDate || (!!due && (
        this.filterDueDate === 'today' ? due >= startToday && due < new Date(startToday.getTime() + 86400000) :
        this.filterDueDate === 'week' ? due >= startWeek && due < new Date(startWeek.getTime() + 7 * 86400000) :
        due < startToday
      ));
      return matchesSearch &&
        (!this.filterProject || String(task.project_id) === this.filterProject) &&
        (!this.filterList || String(task.task_list_id) === this.filterList) &&
        (!this.filterStatus || task.status === this.filterStatus) &&
        (!this.filterPriority || task.priority === this.filterPriority) &&
        matchesDue;
    });
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredTasks.length / this.pageSize));
  }

  get pagedTasks() {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filteredTasks.slice(start, start + this.pageSize);
  }

  resetPage() {
    this.page = 1;
  }

  statusLabel(status: string) {
    return { todo: 'Por fazer', doing: 'Em progresso', done: 'Concluída' }[status] || status;
  }

  formatDate(value: string | null) {
    if (!value) return 'Sem prazo';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sem prazo' : date.toLocaleDateString('pt-PT');
  }

  get canTrackTime() {
    return !!this.selectedTask?.assigneeIds.includes(this.auth.currentUser()?.id || 0);
  }

  get activeOnThisTask() {
    return this.timer.activeEntry()?.task_id === this.selectedTask?.id;
  }

  openTask(row: Task_proj) {
    this.api.getTask(row.id).subscribe(task => {
      this.selectedTask = { ...task, project_id: row.project_id, project_name: row.project_name, task_list_name: row.task_list_name };
      this.editTitle = task.title;
      this.editDescription = task.description;
      this.editStatus = task.status;
      this.editPriority = task.priority;
      this.editDueDate = task.due_date?.slice(0, 10) || '';
      this.editAssignees = [...task.assigneeIds];
      this.recurrenceStartDate = this.editDueDate;
      this.recurrenceEndDate = '';
      this.recurrenceMessage = '';
      this.api.getTeamMembers(row.team_id).subscribe(members => this.members = members);
      this.api.getTeams().subscribe(teams => this.isAdmin = teams.some(team => team.id === row.team_id && team.role === 'admin'));
      this.api.getTaskTimeEntries(row.id).subscribe(entries => this.timeEntries = entries);
    });
  }

  closeTask() {
    this.selectedTask = null;
    this.isAdmin = false;
  }

  toggleAssignee(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.editAssignees = checked ? [...this.editAssignees, id] : this.editAssignees.filter(x => x !== id);
  }

  saveTask() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, {
      title: this.editTitle,
      description: this.editDescription,
      status: this.editStatus,
      priority: this.editPriority,
      dueDate: this.editDueDate || null,
      assigneeIds: this.editAssignees
    }).subscribe(() => {
      this.loadTasks();
      this.closeTask();
    });
  }

  saveStatusOnly() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, { status: this.editStatus }).subscribe(() => this.loadTasks());
  }

  createRecurrence() {
    if (!this.selectedTask) return;
    const payload: Record<string, unknown> = {
      frequency: this.recurrenceFrequency,
      interval: this.recurrenceInterval,
      start_date: this.recurrenceStartDate || this.editDueDate || null,
      end_date: this.recurrenceEndDate || null,
      rule_type: this.recurrenceRuleType
    };
    if (this.recurrenceFrequency === 'weekly') payload['weekday'] = this.recurrenceWeekday;
    if (this.recurrenceFrequency === 'monthly') payload['day_of_month'] = this.recurrenceDayOfMonth;
    if (this.recurrenceFrequency === 'yearly') {
      payload['day_of_month'] = this.recurrenceDayOfMonth;
      payload['month_of_year'] = this.recurrenceMonthOfYear;
    }
    this.api.createRecurrence(this.selectedTask.id, payload).subscribe({
      next: () => this.recurrenceMessage = 'Recorrência criada com sucesso.',
      error: error => this.recurrenceMessage = error?.error?.message || 'Não foi possível criar a recorrência.'
    });
  }

  startTimer() {
    if (this.selectedTask) this.timer.start(this.selectedTask.id);
  }

  stopTimer() {
    this.timer.stop();
    if (this.selectedTask) this.api.getTaskTimeEntries(this.selectedTask.id).subscribe(entries => this.timeEntries = entries);
  }

  postComment() {
    if (!this.selectedTask || !this.newComment.trim()) return;
    this.api.addComment(this.selectedTask.id, this.newComment.trim()).subscribe(comment => {
      this.selectedTask!.comments = [...(this.selectedTask!.comments || []), comment];
      this.newComment = '';
    });
  }

  deleteComment(commentId: number) {
    if (!this.selectedTask || !confirm('Eliminar este comentário?')) return;
    this.api.deleteComment(this.selectedTask.id, commentId).subscribe(() => {
      this.selectedTask!.comments = (this.selectedTask!.comments || []).filter(comment => comment.id !== commentId);
    });
  }

  deleteTask() {
    if (!this.selectedTask || !this.isAdmin || !confirm('Eliminar esta tarefa?')) return;
    this.api.deleteTask(this.selectedTask.id).subscribe(() => {
      this.loadTasks();
      this.closeTask();
    });
  }
}
 