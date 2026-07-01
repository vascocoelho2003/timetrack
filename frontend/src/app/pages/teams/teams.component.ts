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
  template: `
    <div class="page">
      <div class="page-header">
        <h2>As minhas equipas</h2>
        <button class="btn btn-primary" (click)="showForm = !showForm">
          + Nova equipa
        </button>
      </div>

      @if (showForm) {
        <div class="card inline-form">
          <input [(ngModel)]="newTeamName" placeholder="Nome da equipa" />
          <button class="btn btn-primary" (click)="createTeam()">Criar</button>
          <button class="btn btn-ghost" (click)="showForm = false">Cancelar</button>
        </div>
      }

      @if (teams.length === 0 && !loading) {
        <div class="empty-state card">
          <p>Ainda não pertence a nenhuma equipa.</p>
          <p>Crie uma nova equipa para começar.</p>
        </div>
      }

      <div class="grid">
        @for (team of teams; track team.id) {
          <div class="card team-card">
            <a [routerLink]="['/teams', team.id]" class="team-link">
              <h3>{{ team.name }}</h3>
              <span class="badge" [class.badge-admin]="team.role === 'admin'">
                {{ team.role === 'admin' ? 'Admin' : 'Membro' }}
              </span>
            </a>
            @if (team.role === 'admin') {
            <br><br>
              <a href="#" class="delete-link" (click)="deleteTeam(team.id); $event.preventDefault()">
              Eliminar
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
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
