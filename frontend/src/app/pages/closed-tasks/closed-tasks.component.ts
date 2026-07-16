import { Component } from '@angular/core';
import { Project, Task, Comment, TimeEntry, Team, TaskList, User } from '../../core/models';
import { CommonModule, Location } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { formatDuration } from '../../core/timer.service';

@Component({
  selector: 'app-closed-tasks',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './closed-tasks.component.html',
  styleUrl: './closed-tasks.component.css'
})
export class ClosedTasksComponent {
  closed_tasks: Task[] = [];
  taskLists: TaskList[] = [];
  selectedAssignedUserId = 0;
  users_projects: User[] = [];
  selectedTaskListId = 0;
  dateFilter: 'all' | 'week' | 'month' | 'year' | 'range' = 'all';
  fromDate = '';
  toDate = '';
  searchTitle = '';
  viewMode: 'grid' | 'list' = 'grid';
  projectId: number = 0;
  isAdmin = false;
  selectedTask: (Task & { comments?: Comment[] }) | null = null;
  timeEntries: TimeEntry[] = [];
  newComment = '';
  fmt = formatDuration;

  get totalTime() {
    return this.timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
  }

  constructor(private location: Location, private apiService: ApiService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id'));
      this.loadClosedTasks();
      this.loadTaskLists();
      this.apiService.getProject(this.projectId).subscribe(project => {
        this.apiService.getTeams().subscribe(teams => {
          const team = teams.find(t => t.id === project.team_id);
          this.isAdmin = team?.role === 'admin';
        });
      });
      this.apiService.getProjectMembers(this.projectId).subscribe(users => {this.users_projects = users;})
    });
  }

  closeTask(){
    this.selectedTask = null;
  }

  openTask(taskId: number) {
    this.apiService.getTask(taskId).subscribe(task => {
      this.selectedTask = task;
      this.newComment = '';
      this.apiService.getTaskTimeEntries(taskId).subscribe(entries => {
        this.timeEntries = entries;
      });
    });
  }

  reopenTask() {
    if (!this.selectedTask) return;
    this.apiService.updateTask(this.selectedTask.id, { status: 'todo' }).subscribe(updated => {
      this.closed_tasks = this.closed_tasks.filter(t => t.id !== updated.id);
      this.closeTask();
    });
  }

  deleteTask() {
    if (!this.selectedTask || !confirm('Eliminar esta tarefa?')) return;
    this.apiService.deleteTask(this.selectedTask.id).subscribe(() => {
      this.closed_tasks = this.closed_tasks.filter(t => t.id !== this.selectedTask!.id);
      this.closeTask();
    });
  }

  postComment() {
    if (!this.selectedTask || !this.newComment.trim()) return;
    this.apiService.addComment(this.selectedTask.id, this.newComment.trim()).subscribe(comment => {
      this.selectedTask!.comments = [...(this.selectedTask!.comments || []), comment];
      this.newComment = '';
    });
  }

  goBack() {
    this.location.back();
  }

  statusLabel(s: string) {
    return { todo: 'Por fazer', doing: 'Em progresso', done: 'Concluída' }[s] || s;
  }

  formatDateDMY(dateString: string | null | undefined) {
    if (!dateString) return 'Sem prazo';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Sem prazo';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  getTaskListName(taskListId?: number | null) {
    return this.taskLists.find(list => list.id === taskListId)?.name || 'Sem lista';
  }

  get displayedTasks() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const searchText = this.searchTitle.trim().toLowerCase();

    return this.closed_tasks.filter(task => {
      if (
        this.selectedAssignedUserId > 0 &&
        !task.assignees.some(a => a.id === this.selectedAssignedUserId)
      ) {
        return false;
      }
      if (this.selectedTaskListId > 0 && task.task_list_id !== this.selectedTaskListId) {
        return false;
      }

      if (searchText && !task.title?.toLowerCase().includes(searchText)) {
        return false;
      }

      if (this.dateFilter === 'all') {
        return true;
      }

      const dueDateString = task.due_date;
      if (!dueDateString) {
        return false;
      }

      const taskDate = new Date(dueDateString);
      if (Number.isNaN(taskDate.getTime())) {
        return false;
      }

      if (this.dateFilter === 'range') {
        if (!this.fromDate && !this.toDate) {
          return true;
        }

        const rangeStart = this.fromDate ? new Date(this.fromDate) : new Date(0);
        const rangeEnd = this.toDate ? new Date(this.toDate) : today;
        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
          return false;
        }
        return taskDate >= rangeStart && taskDate <= rangeEnd;
      }

      const rangeStart = new Date(today);
      if (this.dateFilter === 'week') {
        rangeStart.setDate(rangeStart.getDate() - 7);
      } else if (this.dateFilter === 'month') {
        rangeStart.setMonth(rangeStart.getMonth() - 1);
      } else if (this.dateFilter === 'year') {
        rangeStart.setFullYear(rangeStart.getFullYear() - 1);
      }

      return taskDate >= rangeStart && taskDate <= today;
    });
  }

  loadTaskLists() {
    this.apiService.getTaskLists(this.projectId).subscribe(lists => {
      this.taskLists = lists;
    });
  }

  loadClosedTasks() {
    this.apiService.getClosedTasks(this.projectId).subscribe(tasks => {
      this.closed_tasks = tasks;
    });
  }
}
