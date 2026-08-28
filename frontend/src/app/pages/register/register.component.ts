import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Department } from '../../core/models';
import { ApiService } from '../../core/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit{
  username = '';
  email = '';
  password = '';
  passwordConfirm = '';
  departmentId: number | null = null;
  error = '';
  loading = false;
  departments: Department[] = [];

  constructor(private auth: AuthService, private router: Router, private apiService: ApiService) {}

  get passwordsMatch(): boolean {
    return this.password.length > 0 && this.password === this.passwordConfirm;
  }

  ngOnInit(): void {
    this.apiService.getDepartments().subscribe({
      next: (data) => { this.departments = data; },
      error: () => { this.error = 'Não foi possível carregar os departamentos.'; },
    });
  }

  submit() {
    this.error = '';

    const usernameRegex = /^[a-zA-Z0-9._]+$/;

    if (!usernameRegex.test(this.username)) {
      this.error = 'O username não pode conter espaços nem caracteres especiais.';
      return;
    }

    if (this.departmentId == null) {
      this.error = 'Selecione um departamento.';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'A password deve ter pelo menos 6 caracteres.';
      return;
    }

    if (this.password !== this.passwordConfirm) {
      this.error = 'As passwords não coincidem.';
      return;
    }

    this.loading = true;

    this.auth.register(this.email, this.password, this.passwordConfirm, this.username, this.departmentId).subscribe({
      next: () => this.router.navigate(['/teams']),
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Erro ao registar';
      },
    });
  }
}
