import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Project, TeamMember } from '../../core/models';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <a routerLink="/teams" class="back-link">← Equipas</a>
      <div class="page-header">
        <h2>{{ teamName }}</h2>
        <a [routerLink]="['/teams', teamId, 'reports']" class="btn btn-ghost">Relatórios</a>
      </div>

      @if (isAdmin) {
        <section class="card section">
          <h3>Membros</h3>
          <div class="inline-form">
            <input [(ngModel)]="memberEmail" placeholder="Email do utilizador" />
            <select [(ngModel)]="memberRole">
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
            <button class="btn btn-primary" (click)="addMember()">Adicionar</button>
          </div>
          @if (memberError) { <div class="alert">{{ memberError }}</div> }
          <ul class="member-list">
            @for (m of members; track m.id) {
              <li>
                <div class="member-item">
                  <span>{{ m.username }} ({{ m.email }})</span>
                  <span class="badge" [class.badge-admin]="m.role === 'admin'">
                    {{ m.role === 'admin' ? 'Admin' : 'Membro' }}
                  </span>
                  <a href="#" class="delete-link" (click)="removeMember(m.id); $event.preventDefault()" title="Remover membro">Remover</a>
                </div>
              </li>
            }
          </ul>
        </section>

        <section class="card section">
          <h3>Novo projeto</h3>
          <div class="inline-form">
            <input [(ngModel)]="projectName" placeholder="Nome do projeto" />
            <input [(ngModel)]="projectDesc" placeholder="Descrição (opcional)" maxlength="50" />
            <button class="btn btn-primary" (click)="createProject()">Criar projeto</button>
          </div>
        </section>
      }

      <section>
        <h3>Projetos</h3>
        @if (projects.length === 0) {
          <div class="empty-state card"><p>Nenhum projeto ainda.</p></div>
        }
        <div class="grid">
          @for (p of projects; track p.id) {
            <div class="card project-card">
              <a [routerLink]="['/projects', p.id]" class="project-link">
                <h4>{{ p.name }}</h4>
                @if (p.description) { <p class="muted">{{ p.description.slice(0, 50) }}</p> }
              </a>
              @if (isAdmin) {
              <a href="#" class="delete-link" (click)="deleteProject(p.id); $event.preventDefault()">
                Eliminar
              </a>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
})
export class TeamComponent implements OnInit {
  teamId = 0;
  teamName = '';
  isAdmin = false;
  members: TeamMember[] = [];
  projects: Project[] = [];
  memberEmail = '';
  memberRole = 'member';
  memberError = '';
  projectName = '';
  projectDesc = '';

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.teamId = +this.route.snapshot.paramMap.get('id')!;
    this.api.getTeams().subscribe(teams => {
      const t = teams.find(x => x.id === this.teamId);
      if (t) {
        this.teamName = t.name;
        this.isAdmin = t.role === 'admin';
      }
    });
    this.api.getTeamMembers(this.teamId).subscribe(m => this.members = m);
    this.api.getProjects(this.teamId).subscribe(p => this.projects = p);
  }

  addMember() {
    this.memberError = '';
    this.api.addTeamMember(this.teamId, this.memberEmail, this.memberRole).subscribe({
      next: m => {
        this.members = [...this.members, m];
        this.memberEmail = '';
      },
      error: err => { this.memberError = err.error?.error || 'Erro'; },
    });
  }

  removeMember(userId: number) {
    if (confirm('Tem a certeza que quer remover este membro?')) {
      this.api.removeTeamMember(this.teamId, userId).subscribe({
        next: () => {
          this.members = this.members.filter(m => m.id !== userId);
        },
      });
    }
  }

  createProject() {
    if (!this.projectName.trim()) return;
    const description = this.projectDesc.trim().slice(0, 50);
    this.api.createProject(this.teamId, this.projectName, description).subscribe({
      next: p => {
        this.projects = [...this.projects, p];
        this.projectName = '';
        this.projectDesc = '';
      },
    });
  }

  deleteProject(projectId: number) {
    if (confirm('Tem a certeza que quer eliminar este projeto?')) {
      this.api.deleteProject(projectId).subscribe({
        next: () => {
          this.projects = this.projects.filter(p => p.id !== projectId);
        },
      });
    }
  }
}
