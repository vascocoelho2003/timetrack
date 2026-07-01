import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { formatDuration } from '../../core/timer.service';
import { ReportData } from '../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page">
      <a [routerLink]="['/teams', teamId]" class="back-link">← Equipa</a>
      <h2>Relatórios de tempo</h2>

      @if (report) {
        <div class="report-grid">
          <div class="card section">
            <h3>Por utilizador</h3>
            @if (report.byUser.length === 0) { <p class="muted">Sem dados</p> }
            @for (r of report.byUser; track r.id) {
              <div class="report-row">
                <span>{{ r.name }}</span>
                <strong>{{ fmt(r.total_seconds) }}</strong>
              </div>
            }
          </div>
          <div class="card section">
            <h3>Por projeto</h3>
            @if (report.byProject.length === 0) { <p class="muted">Sem dados</p> }
            @for (r of report.byProject; track r.id) {
              <div class="report-row">
                <span>{{ r.name }}</span>
                <strong>{{ fmt(r.total_seconds) }}</strong>
              </div>
            }
          </div>
          <div class="card section">
            <h3>Por tarefa</h3>
            @if (report.byTask.length === 0) { <p class="muted">Sem dados</p> }
            @for (r of report.byTask; track r.id) {
              <div class="report-row">
                <span>{{ r.title }}</span>
                <strong>{{ fmt(r.total_seconds) }}</strong>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  teamId = 0;
  report: ReportData | null = null;
  fmt = formatDuration;

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.teamId = +this.route.snapshot.paramMap.get('id')!;
    this.api.getTeamReport(this.teamId).subscribe(r => this.report = r);
  }
}
