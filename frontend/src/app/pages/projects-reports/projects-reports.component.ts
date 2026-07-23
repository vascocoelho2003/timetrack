import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Team, TeamModel, userProjectsDetails } from '../../core/models';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-projects-reports',
  imports: [RouterLink,MatFormFieldModule,MatInputModule, FormsModule],
  templateUrl: './projects-reports.component.html',
  styleUrl: './projects-reports.component.css'
})
export class ProjectsReportsComponent implements OnInit{
  projects : userProjectsDetails [] = [];
  filteredProjects: userProjectsDetails[] = [];
  teams : TeamModel [] = [];
  selectedTeamId = '';
  searchText = '';

  constructor(
    private auth: AuthService,
    private apiService: ApiService,
    private location: Location
  ){
  }

  ngOnInit(): void {
    this.apiService.getUserProjectDetails().subscribe({
      next: (data) => {
        this.projects = data;
        this.filteredProjects = data;
        this.loadTeams();
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  applyFilters(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredProjects = this.projects.filter(project => {
      const matchesTeam =
        this.selectedTeamId === '' ||
        project.team_id === Number(this.selectedTeamId);

      const matchesName =
        project.name.toLowerCase().includes(search);

      return matchesTeam && matchesName;
    });
  }

  filterByTeam(teamId: string): void {
    this.selectedTeamId = teamId;
    this.applyFilters();
  }
  
  loadTeams(): void {
    const teamsMap = new Map<number, TeamModel>();
  
    this.projects.forEach(project => {
      teamsMap.set(project.team_id, {
        id: project.team_id,
        name: project.team_name
      });
    });
  
    this.teams = Array.from(teamsMap.values());
  }

}
