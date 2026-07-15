import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/auth.service';
import { TimerService, formatDuration } from './core/timer.service';

@Component({
  selector: 'app-root',
  standalone: true,
<<<<<<< Updated upstream
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
=======
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html' 
>>>>>>> Stashed changes
})
export class AppComponent implements OnInit {

  fmt = formatDuration;

  menuOpen = false;
  showBurger = false;

  @HostListener('window:resize')
  checkMenu() {
    this.showBurger = window.innerWidth < 980; // ou calcular dinamicamente
  }

ngAfterViewInit() {
  this.checkMenu();
}

  constructor(
    public auth: AuthService,
    public timer: TimerService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn) {
      this.timer.refresh();
    }
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

}