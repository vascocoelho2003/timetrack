import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminDepartment } from '../../core/models';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-admin-departments',
  imports: [FormsModule, RouterLink, MatCheckboxModule],
  templateUrl: './admin-departments.component.html',
  styleUrl: './admin-departments.component.css',
})
export class AdminDepartmentsComponent implements OnInit {
  items: AdminDepartment[] = [];
  filtered: AdminDepartment[] = [];
  searchText = '';
  page = 1;
  pageSize = 10;
  showNewDepartmentForm = false;
  NewDepartmentName = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.apiService.getAdminDepartments().subscribe({
      next: (data) => {
        this.items = data;
        this.applyFilter();
      },
    });
  }

  createDepartment() {
    const name = this.NewDepartmentName.trim();
    if (!name) return;
    this.apiService.createDepartment(name).subscribe({
      next: () => {
        this.NewDepartmentName = '';
        this.showNewDepartmentForm = false;
        this.loadDepartments();
      },
    });
  }

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();
    this.filtered = search
      ? this.items.filter((d) => d.name.toLowerCase().includes(search))
      : [...this.items];
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedItems(): AdminDepartment[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
}
