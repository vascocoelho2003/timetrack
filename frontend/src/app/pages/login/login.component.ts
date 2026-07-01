import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <h1>Task Management</h1>
        <p class="subtitle">Entrar na conta</p>
        @if (error) { <div class="alert">{{ error }}</div> }
        <form (ngSubmit)="submit()">
          <label>Email</label>
          <input type="email" [(ngModel)]="email" name="email" required />
          <label>Password</label>
          <input type="password" [(ngModel)]="password" name="password" required />
          <br> <br> 
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'A entrar...' : 'Entrar' }}
          </button>
        </form>
        <p class="footer-link">Não tem conta? <a routerLink="/register">Registar</a></p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading = false; this.router.navigate(['/teams']); },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Erro ao entrar';
      },
    });
  }
}
