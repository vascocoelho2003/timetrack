import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { formatDuration } from '../../core/timer.service';
import { ReportData } from '../../core/models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
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
