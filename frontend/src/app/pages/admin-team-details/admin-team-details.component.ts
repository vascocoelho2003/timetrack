import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TeamMember } from '../../core/models';

@Component({
  selector: 'app-admin-team-details',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-team-details.component.html',
  styleUrl: './admin-team-details.component.css',
})
export class AdminTeamDetailsComponent implements OnInit {
  teamId = 0;
  teamName = '';
  members: TeamMember[] = [];
  loading = true;
  error = '';
  formError = '';
  memberEmail = '';
  memberRole: 'admin' | 'member' = 'member';
  adding = false;
  updatingUserId: number | null = null;
  removingUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    this.teamId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.teamId) {
      this.loading = false;
      this.error = 'Equipa inválida.';
      return;
    }
    this.loadData();
  }

  get adminCount(): number {
    return this.members.filter((m) => m.role === 'admin').length;
  }

  canChangeRole(member: TeamMember): boolean {
    return !(member.role === 'admin' && this.adminCount <= 1);
  }

  canRemove(member: TeamMember): boolean {
    return this.canChangeRole(member);
  }

  addMember(): void {
    this.formError = '';
    const email = this.memberEmail.trim().toLowerCase();
    if (!email) {
      this.formError = 'O email é obrigatório.';
      return;
    }

    this.adding = true;
    this.apiService.addTeamMember(this.teamId, email, this.memberRole).subscribe({
      next: () => {
        this.adding = false;
        this.memberEmail = '';
        this.memberRole = 'member';
        this.loadMembers();
      },
      error: (err) => {
        this.adding = false;
        this.formError = err.error?.error || 'Não foi possível adicionar o membro.';
      },
    });
  }

  changeRole(member: TeamMember, role: string): void {
    this.error = '';
    if (role !== 'admin' && role !== 'member') return;
    if (member.role === role) return;

    this.updatingUserId = member.id;
    this.apiService.updateTeamMemberRole(this.teamId, member.id, role).subscribe({
      next: (updated) => {
        member.role = updated.role;
        this.updatingUserId = null;
      },
      error: (err) => {
        this.updatingUserId = null;
        this.error = err.error?.error || 'Não foi possível atualizar o role.';
      },
    });
  }

  removeMember(member: TeamMember): void {
    this.error = '';
    if (!confirm(`Remover ${member.username} desta equipa?`)) return;

    this.removingUserId = member.id;
    this.apiService.removeTeamMember(this.teamId, member.id).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== member.id);
        this.removingUserId = null;
      },
      error: (err) => {
        this.removingUserId = null;
        this.error = err.error?.error || 'Não foi possível remover o membro.';
      },
    });
  }

  private loadData(): void {
    forkJoin({
      team: this.apiService.getTeam(this.teamId),
      members: this.apiService.getTeamMembers(this.teamId),
    }).subscribe({
      next: ({ team, members }) => {
        this.teamName = team.name;
        this.members = members;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Não foi possível carregar a equipa.';
      },
    });
  }

  private loadMembers(): void {
    this.apiService.getTeamMembers(this.teamId).subscribe({
      next: (members) => {
        this.members = members;
      },
      error: (err) => {
        this.error = err.error?.error || 'Não foi possível carregar os membros.';
      },
    });
  }
}
