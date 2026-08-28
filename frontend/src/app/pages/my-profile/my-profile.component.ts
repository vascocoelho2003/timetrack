import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Department } from '../../core/models';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit {
  username = '';
  email = '';
  departmentId: number | null = null;
  departments: Department[] = [];
  newPassword = '';
  confirmationPassword = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmationPassword = false;
  loading = false;
  error = '';
  success = '';

  constructor(private auth: AuthService, private apiService: ApiService) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.username = user.username;
      this.email = user.email;
      this.departmentId = user.department_id ?? null;

      this.apiService.getDepartments().subscribe({
        next: (data) => {
          this.departments = data;
          this.apiService.getMyDepartment().subscribe({
            next: (dept) => {
              if (dept?.id != null) {
                this.departmentId = dept.id;
              }
            },
            error: () => {
              if (this.departmentId == null) {
                this.error = 'Não foi possível carregar o departamento.';
              }
            },
          });
        },
        error: () => { this.error = 'Não foi possível carregar os departamentos.'; },
      });
    }
  }

  submit() {
    this.error = '';
    this.success = '';

    if (this.departmentId == null) {
      this.error = 'Selecione um departamento.';
      return;
    }

    if (this.newPassword !== this.confirmationPassword) {
      this.error = 'As passwords novas não coincidem.';
      return;
    }

    this.loading = true;
    this.auth.updateProfile(
      this.username.trim(),
      this.email.trim(),
      this.departmentId,
      this.newPassword || undefined
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.username = res.user.username;
        this.email = res.user.email;
        this.departmentId = res.user.department_id ?? this.departmentId;
        this.newPassword = '';
        this.confirmationPassword = '';
        this.showNewPassword = false;
        this.showConfirmationPassword = false;
        this.success = 'Perfil atualizado com sucesso.';
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Não foi possível atualizar o perfil.';
      },
    });
  }
}
