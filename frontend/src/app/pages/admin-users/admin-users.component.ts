import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AdminUser, Department } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  items: AdminUser[] = [];
  filtered: AdminUser[] = [];
  departments: Department[] = [];
  searchText = '';
  page = 1;
  pageSize = 10;
  currentUserId = 0;
  error = '';
  formError = '';
  showNewUserForm = false;
  creating = false;
  newUsername = '';
  newEmail = '';
  newPassword = '';
  newPasswordConfirm = '';
  newDepartmentId: number | null = null;
  newProfile: 'admin' | 'user' = 'user';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser()?.id ?? 0;
    this.loadUsers();
    this.apiService.getDepartments().subscribe({
      next: (data) => {
        this.departments = data;
      },
      error: () => {
        this.error = 'Não foi possível carregar os departamentos.';
      },
    });
  }

  loadUsers(): void {
    this.apiService.getAdminUsers().subscribe({
      next: (data) => {
        this.items = data;
        this.applyFilterInternal(false);
      },
      error: () => {
        this.error = 'Não foi possível carregar os utilizadores.';
      },
    });
  }

  toggleNewUserForm(): void {
    this.showNewUserForm = !this.showNewUserForm;
    this.formError = '';
    if (!this.showNewUserForm) this.resetNewUserForm();
  }

  applyFilter(): void {
    this.applyFilterInternal(true);
  }

  private applyFilterInternal(resetPage: boolean): void {
    const search = this.searchText.trim().toLowerCase();
    this.filtered = search
      ? this.items.filter(
          (u) =>
            u.username.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            (u.department_name ?? '').toLowerCase().includes(search),
        )
      : [...this.items];
    if (resetPage) this.page = 1;
  }

  openUser(user: AdminUser): void {
    this.router.navigate(['/admin-panel/users', user.id]);
  }

  setActive(event: Event, user: AdminUser, active: boolean): void {
    event.stopPropagation();
    this.error = '';
    this.apiService.setAdminUserActive(user.id, active).subscribe({
      next: (updated) => {
        this.items = this.items.map((u) => (u.id === updated.id ? updated : u));
        this.applyFilterInternal(false);
      },
      error: (err) => {
        this.error =
          err.error?.error || 'Não foi possível atualizar o utilizador.';
      },
    });
  }

  createUser(): void {
    this.formError = '';
    const username = this.newUsername.trim();
    const email = this.newEmail.trim();

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      this.formError =
        'O username só pode conter letras, números, ponto e underscore.';
      return;
    }
    if (!email) {
      this.formError = 'O email é obrigatório.';
      return;
    }
    if (this.newDepartmentId == null) {
      this.formError = 'Selecione um departamento.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.formError = 'A password deve ter pelo menos 6 caracteres.';
      return;
    }
    if (this.newPassword !== this.newPasswordConfirm) {
      this.formError = 'As passwords não coincidem.';
      return;
    }

    this.creating = true;
    this.apiService
      .createAdminUser({
        username,
        email,
        password: this.newPassword,
        passwordConfirm: this.newPasswordConfirm,
        department_id: this.newDepartmentId,
        profile: this.newProfile,
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.showNewUserForm = false;
          this.resetNewUserForm();
          this.loadUsers();
        },
        error: (err) => {
          this.creating = false;
          this.formError =
            err.error?.error || 'Não foi possível criar o utilizador.';
        },
      });
  }

  private resetNewUserForm(): void {
    this.newUsername = '';
    this.newEmail = '';
    this.newPassword = '';
    this.newPasswordConfirm = '';
    this.newDepartmentId = null;
    this.newProfile = 'user';
    this.formError = '';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedItems(): AdminUser[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
}
