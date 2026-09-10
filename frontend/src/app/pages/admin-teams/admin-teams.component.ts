import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminTeam } from '../../core/models';

@Component({
  selector: 'app-admin-teams',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-teams.component.html',
  styleUrl: './admin-teams.component.css',
})
export class AdminTeamsComponent implements OnInit {
  items: AdminTeam[] = [];
  filtered: AdminTeam[] = [];
  searchText = '';
  page = 1;
  pageSize = 10;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getAdminTeams().subscribe({
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
          (t) =>
            t.name.toLowerCase().includes(search) ||
            (t.created_by_name ?? '').toLowerCase().includes(search),
        )
      : [...this.items];
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  get pagedItems(): AdminTeam[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
}
