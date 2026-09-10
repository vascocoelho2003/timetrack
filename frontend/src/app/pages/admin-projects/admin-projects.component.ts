import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminProject } from '../../core/models';

@Component({
  selector: 'app-admin-projects',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-projects.component.html',
  styleUrl: './admin-projects.component.css',
})
export class AdminProjectsComponent implements OnInit {
  items: AdminProject[] = [];
  filtered: AdminProject[] = [];
  searchText = '';
  page = 1;
  pageSize = 10;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getAdminProjects().subscribe({
      next: (data) => {
        this.items = data;
        this.applyFilter();
      },
    });
  }

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();
    this.filtered = search
      ? this.items.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.team_name.toLowerCase().includes(search),
        )
      : [...this.items];
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedItems(): AdminProject[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
}
