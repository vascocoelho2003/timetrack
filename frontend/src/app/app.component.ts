import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth.service';
import { TimerService, formatDuration } from './core/timer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isLoggedIn) {
      <header class="app-header">
        <a routerLink="/teams" class="logo">
          JC Ribeiro - Task Management
        </a>
        <nav class="header-nav">
          <a routerLink="/reports" class="nav-link" [class.active]="isActive('/reports')">Dashboard</a>
          <a routerLink="/teams" class="nav-link" [class.active]="isActive('/teams')">Calendário</a>
          <a routerLink="/projects" class="nav-link" [class.active]="isActive('/projects')">Projetos</a>
          <a routerLink="/my-tasks" class="nav-link" [class.active]="isActive('/my-tasks')">Tarefas</a>
        </nav>
        @if (timer.activeEntry(); as active) {
          <div class="header-timer">
            ⏱ {{ fmt(timer.elapsedSeconds()) }} — {{ active.task_title }}
            <button class="btn btn-sm btn-danger" (click)="timer.stop()">Parar</button>
          </div>
        }
        <div class="header-user">
          <span>{{ auth.currentUser()?.username  }}</span>
          <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Sair</button>
        </div>
      </header>
    }
    <main [class.with-header]="auth.isLoggedIn">
      <router-outlet />
    </main>
  `,
})
export class AppComponent implements OnInit {
  fmt = formatDuration;

  constructor(public auth: AuthService, public timer: TimerService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn) this.timer.refresh();
  }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}
