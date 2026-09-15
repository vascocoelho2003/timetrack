import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DepartmentMember } from '../../core/models';

@Component({
  selector: 'app-admin-department-details',
  imports: [RouterLink],
  templateUrl: './admin-department-details.component.html',
  styleUrl: './admin-department-details.component.css',
})
export class AdminDepartmentDetailsComponent implements OnInit {
  departmentId = 0;
  departmentName = '';
  members: DepartmentMember[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.departmentId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.departmentId) {
      this.loading = false;
      this.error = 'Departamento inválido.';
      return;
    }

    forkJoin({
      department: this.apiService.getDepartment(this.departmentId),
      members: this.apiService.getDepartmentMembers(this.departmentId),
    }).subscribe({
      next: ({ department, members }) => {
        this.departmentName = department.name;
        this.members = members;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err.error?.error || 'Não foi possível carregar o departamento.';
      },
    });
  }

  openUser(userId: number): void {
    this.router.navigate(['/admin-panel/users', userId], {
      queryParams: { department: this.departmentId },
    });
  }

  profileLabel(profile: string): string {
    return profile === 'admin' ? 'Administrador' : 'Utilizador';
  }
}
