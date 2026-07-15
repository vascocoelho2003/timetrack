import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Project, TeamMember } from '../../core/models';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
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

  constructor(private route: ActivatedRoute, private api: ApiService, private http: HttpClient) {}

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
