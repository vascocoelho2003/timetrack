import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Team } from '../../core/models';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl:'./teams.component.html',
  styleUrl: './teams.component.css'
})
export class TeamsComponent implements OnInit {
  teams: Team[] = [];
  newTeamName = '';
  showForm = false;
  loading = true;

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.getTeams().subscribe({
      next: t => { this.teams = t; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  createTeam() {
    if (!this.newTeamName.trim()) return;
    this.api.createTeam(this.newTeamName.trim()).subscribe({
      next: team => {
        this.teams = [...this.teams, team];
        this.newTeamName = '';
        this.showForm = false;
      },
    });
  }

  deleteTeam(teamId: number) {
    if (confirm('Tem a certeza que quer eliminar esta equipa?')) {
      this.api.deleteTeam(teamId).subscribe({
        next: () => {
          this.teams = this.teams.filter(t => t.id !== teamId);
        },
      });
    }
  }
}
