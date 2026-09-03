import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientReport } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-client-reports',
  imports: [FormsModule],
  templateUrl: './client-reports.component.html',
  styleUrl: './client-reports.component.css'
})
export class ClientReportsComponent implements OnInit{
  
  reports: ClientReport[] = [];
  startDate = '';
  endDate = '';
  page = 1;
  pageSize = 10;

  constructor(private authService: AuthService,private apiService: ApiService,private router:Router){}

  ngOnInit(): void {
    const now = new Date();
    this.startDate = `${now.getFullYear()}-01-01`;
    this.endDate = this.toDateInput(now);
    this.loadReport();
  }

  loadReport(): void {
    this.apiService.getGeneralClientReport(this.startDate, this.endDate).subscribe({
      next: (data)=>{
        this.reports = data;
        this.page = 1;
      },      
      error: (error) => {
        console.log("Erro ao carregar o relatório", error);
      }
    });
  }

  onCustomDateChange(): void {
    if (this.startDate && this.endDate) {
      this.loadReport();
    }
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.reports.length / this.pageSize));
  }

  get pagedReports(): ClientReport[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.reports.slice(start, start + this.pageSize);
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(remainingSeconds).padStart(2, '0')
    ].join(':');
  }
}
