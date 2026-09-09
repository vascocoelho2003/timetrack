import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AdminDashboard } from '../../core/models';

@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent implements OnInit {
  stats: AdminDashboard = {
    total_users: 0,
    total_departments: 0,
    total_teams: 0,
    total_projects: 0,
    total_tasks: 0,
    total_clients: 0,
  };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getAdminDashboard().subscribe({
      next: (data) => {
        this.stats = data;
      }
    });
  }
}
