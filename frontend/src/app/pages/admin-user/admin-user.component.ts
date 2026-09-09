import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdminUser, Department, User } from '../../core/models';

@Component({
  selector: 'app-admin-user',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-user.component.html',
  styleUrl: './admin-user.component.css'
})
export class AdminUserComponent implements OnInit {
  userId = 0;
  username = '';
  email = '';
  departmentId: number | null = null;
  profile: 'admin' | 'user' = 'user';
  active = true;
  departments: Department[] = [];
  newPassword = '';
  passwordConfirm = '';
  loading = true;
  saving = false;
  error = '';
  success = '';
  currentUserId = 0;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser()?.id ?? 0;
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.userId) {
      this.loading = false;
      this.error = 'Utilizador inválido.';
      return;
    }

    this.apiService.getDepartments().subscribe({
      next: (data) => { this.departments = data; },
      error: () => { this.error = 'Não foi possível carregar os departamentos.'; },
    });

    this.apiService.getAdminUser(this.userId).subscribe({
      next: (user) => {
        this.applyUser(user);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Não foi possível carregar o utilizador.';
      }
    });
  }

  submit(): void {
    this.error = '';
    this.success = '';

    const username = this.username.trim();
    const email = this.email.trim();

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      this.error = 'O username só pode conter letras, números, ponto e underscore.';
      return;
    }
    if (!email) {
      this.error = 'O email é obrigatório.';
      return;
    }
    if (this.departmentId == null) {
      this.error = 'Selecione um departamento.';
      return;
    }
    if (this.newPassword || this.passwordConfirm) {
      if (this.newPassword.length < 6) {
        this.error = 'A password deve ter pelo menos 6 caracteres.';
        return;
      }
      if (this.newPassword !== this.passwordConfirm) {
        this.error = 'As passwords não coincidem.';
        return;
      }
    }

    this.saving = true;
    this.apiService.updateAdminUser(this.userId, {
      username,
      email,
      department_id: this.departmentId,
      profile: this.profile,
      ...(this.newPassword ? { password: this.newPassword } : {}),
    }).subscribe({
      next: (res) => {
        this.saving = false;
        this.applyUser(res.user);
        this.newPassword = '';
        this.passwordConfirm = '';
        this.success = 'Utilizador atualizado com sucesso.';
        this.authService.syncCurrentUser(res.user as User, res.token);
      },
      error: (err) => {
        this.saving = false;
        this.error = err.error?.error || 'Não foi possível atualizar o utilizador.';
      }
    });
  }

  private applyUser(user: AdminUser): void {
    this.username = user.username;
    this.email = user.email;
    this.departmentId = user.department_id;
    this.profile = user.profile === 'admin' ? 'admin' : 'user';
    this.active = user.active;
  }
}
