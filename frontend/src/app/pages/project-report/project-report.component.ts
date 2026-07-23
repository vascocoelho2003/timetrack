import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { FormsModule } from '@angular/forms';
import { project_report } from '../../core/models';

@Component({
  selector: 'app-project-report',
  imports: [RouterLink, FormsModule],
  templateUrl: './project-report.component.html',
  styleUrl: './project-report.component.css'
})
export class ProjectReportComponent implements OnInit {
  
  id!: number;
  dados?: project_report;
  selectedPeriod = 'custom';
  startDate = '';
  endDate = '';

  constructor(
    private route : ActivatedRoute,
    private apiService: ApiService
  ){}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.id = Number(params.get('id'));
      this.loadReport();
    });
  }

  loadReport(): void {
    const dates = this.selectedPeriod === 'custom'
      ? { startDate: this.startDate, endDate: this.endDate }
      : this.getPeriodDates(this.selectedPeriod);

    this.apiService.getProjectReport(this.id, dates.startDate, dates.endDate).subscribe({
      next: (data)=>{
        this.dados = data;
      },
      error: (error)=>{
        console.log("Erro ao obter os dados do Relatório do Projeto", error);
      }});
  }

  onPeriodChange(): void {
    if (this.selectedPeriod !== 'custom') {
      const dates = this.getPeriodDates(this.selectedPeriod);
      this.startDate = dates.startDate;
      this.endDate = dates.endDate;
    }
    this.loadReport();
  }

  onCustomDateChange(): void {
    if (this.selectedPeriod === 'custom' && this.startDate && this.endDate) {
      this.loadReport();
    }
  }

  private getPeriodDates(period: string): { startDate: string; endDate: string } {
    const now = new Date();
    let start: Date;

    if (period === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: this.toDateInput(start), endDate: this.toDateInput(end) };
    }

    if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate: this.toDateInput(start), endDate: this.toDateInput(now) };
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
  
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
