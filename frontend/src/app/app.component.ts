import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/auth.service';
import { ApiService } from './core/api.service';
import { TimerService, formatDuration } from './core/timer.service';
import { Project, TaskList, Task_proj } from './core/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  fmt = formatDuration;

  menuOpen = false;
  showBurger = false;
  darkMode = false;
  showTaskModal = false;
  savingTask = false;
  taskError = '';
  assignMode: 'create' | 'existing' = 'create';
  taskTitle = '';
  taskDescription = '';
  taskProjectId: number | null = null;
  taskListId: number | null = null;
  existingTaskId: number | null = null;
  existingTasks: Task_proj[] = [];
  projects: Project[] = [];
  lists: TaskList[] = [];

  @HostListener('window:resize')
  checkMenu() {
    this.showBurger = window.innerWidth < 980;
  }

  ngAfterViewInit() {
    this.checkMenu();
  }

  constructor(
    public auth: AuthService,
    public timer: TimerService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.darkMode = localStorage.getItem('dark-mode') === 'true';
    this.applyTheme();

    if (this.auth.isLoggedIn) {
      this.timer.refresh(() => {
        if (this.timer.pendingUnassigned()) this.openTaskModal();
      });
    }
  }

  startQuickTimer() {
    if (this.timer.pendingUnassigned()) {
      this.openTaskModal();
      return;
    }
    this.timer.start();
  }

  stopHeaderTimer() {
    this.timer.stop().subscribe({
      next: entry => {
        if (entry && !entry.task_id) this.openTaskModal();
      }
    });
  }

  openTaskModal() {
    this.showTaskModal = true;
    this.taskError = '';
    this.savingTask = false;
    if (!this.projects.length) this.loadProjects();
    this.loadExistingTasks();
  }

  loadProjects() {
    this.api.getUserProjects().subscribe(projects => {
      this.projects = projects;
    });
  }

  loadExistingTasks() {
    this.api.getUserTasks().subscribe(tasks => {
      this.existingTasks = tasks;
    });
  }

  setAssignMode(mode: 'create' | 'existing') {
    this.assignMode = mode;
    this.taskError = '';
  }

  onProjectChange() {
    this.taskListId = null;
    this.lists = [];
    if (!this.taskProjectId) return;
    this.api.getTaskLists(this.taskProjectId).subscribe(lists => {
      this.lists = lists;
    });
  }

  saveTimerTask() {
    const pending = this.timer.pendingUnassigned();
    if (!pending) return;

    if (this.assignMode === 'existing') {
      if (!this.existingTaskId) {
        this.taskError = 'Escolha a tarefa à qual quer atribuir o tempo.';
        return;
      }
      this.savingTask = true;
      this.taskError = '';
      this.api.assignUnassignedTimer(pending.id, {
        existingTaskId: this.existingTaskId,
      }).subscribe({
        next: () => this.finishAssign(),
        error: (err) => {
          this.savingTask = false;
          this.taskError = err?.error?.error || 'Não foi possível atribuir o tempo.';
        }
      });
      return;
    }

    if (!this.taskTitle.trim()) {
      this.taskError = 'Indique um título para a tarefa.';
      return;
    }
    if (this.taskProjectId && !this.taskListId) {
      this.taskError = 'Escolha a lista da tarefa.';
      return;
    }

    this.savingTask = true;
    this.taskError = '';
    this.api.assignUnassignedTimer(pending.id, {
      title: this.taskTitle.trim(),
      description: this.taskDescription.trim(),
      taskListId: this.taskListId,
    }).subscribe({
      next: () => this.finishAssign(),
      error: (err) => {
        this.savingTask = false;
        this.taskError = err?.error?.error || 'Não foi possível criar a tarefa.';
      }
    });
  }

  private finishAssign() {
    this.timer.clearPendingUnassigned();
    this.resetTaskForm();
    this.showTaskModal = false;
    this.savingTask = false;
  }

  discardTimerTask() {
    const pending = this.timer.pendingUnassigned();
    if (!pending) {
      this.showTaskModal = false;
      return;
    }
    if (!confirm('Descartar este tempo registado?')) return;
    this.api.discardUnassignedTimer(pending.id).subscribe({
      next: () => {
        this.timer.clearPendingUnassigned();
        this.resetTaskForm();
        this.showTaskModal = false;
      },
      error: (err) => {
        this.taskError = err?.error?.error || 'Não foi possível descartar o tempo.';
      }
    });
  }

  private resetTaskForm() {
    this.assignMode = 'create';
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskProjectId = null;
    this.taskListId = null;
    this.existingTaskId = null;
    this.lists = [];
    this.taskError = '';
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('dark-mode', String(this.darkMode));
    this.applyTheme();
  }

  setDarkMode(enabled: boolean) {
    this.darkMode = enabled;
    localStorage.setItem('dark-mode', String(enabled));
    this.applyTheme();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }

  private applyTheme() {
    document.documentElement.classList.toggle('dark-mode', this.darkMode);
  }
}
