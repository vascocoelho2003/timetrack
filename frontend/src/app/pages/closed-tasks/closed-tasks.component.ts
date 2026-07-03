import { Component } from '@angular/core';
import { Project, Task, Comment, TimeEntry, Team } from '../../core/models';
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
      this.apiService.getProject(this.projectId).subscribe(project => {
        this.apiService.getTeams().subscribe(teams => {
          const team = teams.find(t => t.id === project.team_id);
          this.isAdmin = team?.role === 'admin';
        });
      });
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

  loadClosedTasks() {
    this.apiService.getClosedTasks(this.projectId).subscribe(tasks => {
      this.closed_tasks = tasks;
    });
  }
}
