import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
        <nav>
          <a routerLink="/reports" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">&nbsp;&nbsp;Dashboard</a>
        </nav>
        <nav>
          <a routerLink="/projects" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Projetos</a>
        </nav>
        <nav>
          <a routerLink="/teams" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">&nbsp;&nbsp;Equipas</a>
        </nav>
        @if (timer.activeEntry(); as active) {
          <div class="header-timer">
            ⏱ {{ fmt(timer.elapsedSeconds()) }} — {{ active.task_title }}
            <button class="btn btn-sm btn-danger" (click)="timer.stop()">Parar</button>
          </div>
        }
        <div class="header-user">
          <span>{{ auth.currentUser()?.name }}</span>
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

  constructor(public auth: AuthService, public timer: TimerService) {}

  ngOnInit() {
    if (this.auth.isLoggedIn) this.timer.refresh();
  }
}
