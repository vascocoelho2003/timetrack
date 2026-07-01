import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <h1>Task Management</h1>
        <p class="subtitle">Criar conta</p>
        @if (error) { <div class="alert">{{ error }}</div> }
        <form (ngSubmit)="submit()">
          <label>Nome</label>
          <input type="text" [(ngModel)]="name" name="name" required />
          <label>Email</label>
          <input type="email" [(ngModel)]="email" name="email" required />
          <label>Password</label>
          <input type="password" [(ngModel)]="password" name="password" required minlength="6" />
           <br> <br>
          <button type="submit" class="btn btn-primary" [disabled]="loading">
            {{ loading ? 'A criar...' : 'Registar' }}
          </button>
        </form>
        <p class="footer-link">Já tem conta? <a routerLink="/login">Entrar</a></p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error = '';
    this.loading = true;
    this.auth.register(this.email, this.password, this.name).subscribe({
      next: () => this.router.navigate(['/teams']),
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Erro ao registar';
      },
    });
  }
}