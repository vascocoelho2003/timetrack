import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-password-reset',
  imports: [FormsModule, RouterLink],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css',
})
export class PasswordResetComponent implements OnInit {
  waiting = false;
  email = '';
  password = '';
  passwordConfirm = '';
  token = '';
  error = '';
  success = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  get passwordsMatch(): boolean {
    return this.password.length > 0 && this.password === this.passwordConfirm;
  }

  submitEmail(): void {
    this.error = '';
    this.success = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.error = 'Indique um email válido (ex: nome@dominio.com).';
      return;
    }

    this.waiting = true;
    this.apiService.password_recover(this.email.trim()).subscribe({
      next: (data) => {
        this.waiting = false;
        this.success = data.message;
      },
      error: (err) => {
        this.waiting = false;
        this.error =
          err.error?.error || 'Não foi possível enviar o pedido de recuperação.';
      },
    });
  }

  submitPassword(): void {
    this.error = '';
    this.success = '';
    if (this.password.length < 6) {
      this.error = 'A password deve ter pelo menos 6 caracteres.';
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.error = 'As passwords não coincidem.';
      return;
    }

    this.waiting = true;
    this.apiService
      .resetPassword(this.token, this.password, this.passwordConfirm)
      .subscribe({
        next: (data) => {
          this.waiting = false;
          this.success = data.message;
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (err) => {
          this.waiting = false;
          this.error =
            err.error?.error || 'Não foi possível atualizar a password.';
        },
      });
  }
}
