import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientReport } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-client-reports',
  imports: [FormsModule],
  templateUrl: './client-reports.component.html',
  styleUrl: './client-reports.component.css'
})
export class ClientReportsComponent implements OnInit{
  
  reports: ClientReport[] = [];
  filteredReports: ClientReport[] = [];
  searchText = '';
  startDate = '';
  endDate = '';
  page = 1;
  pageSize = 10;
  selected_user_id = 0;

  constructor(private authService: AuthService,private apiService: ApiService,private router:Router){}

  ngOnInit(): void {
    const now = new Date();
    this.startDate = `${now.getFullYear()}-01-01`;
    this.endDate = this.toDateInput(now);
    this.loadReport();
  }

  selectRow(report: ClientReport): void {
    this.selected_user_id = report.user_id;
    this.router.navigate(['/individual-client-report'], {
      state: { id: report.user_id, username: report.username, startDate: this.startDate, endDate:this.endDate }
    });
  }

  loadReport(): void {
    this.apiService.getGeneralClientReport(this.startDate, this.endDate).subscribe({
      next: (data)=>{
        this.reports = data;
        this.applyFilter();
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

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();
    this.filteredReports = search
      ? this.reports.filter(r => r.username.toLowerCase().includes(search))
      : [...this.reports];
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredReports.length / this.pageSize));
  }

  get pagedReports(): ClientReport[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filteredReports.slice(start, start + this.pageSize);
  }

  async exportPdf(): Promise<void> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    const logo = await this.loadImage('/JCR_logotipo.png');
    if (logo) {
      const logoWidth = 15;
      const logoHeight = logoWidth * (logo.height / logo.width);
      doc.addImage(logo, 'PNG', margin, 14, logoWidth, logoHeight);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('JC Ribeiro Task Management', pageWidth - margin, 20, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Relatório Geral de Cliente', margin, 43);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Período: ${this.getPeriodLabel()}`, margin, 52);

    autoTable(doc, {
      startY: 62,
      margin: { left: margin, right: margin },
      head: [['Colaborador', 'Nº de Tarefas', 'Tempo Despendido']],
      body: this.filteredReports.map(r => [
        r.username,
        `${r.total_tarefas} tarefas`,
        this.formatDuration(r.tempo_total)
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [25, 25, 25],
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        lineColor: [210, 210, 210],
        lineWidth: 0.15,
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [25, 25, 25],
        lineColor: [110, 110, 110],
        lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' }
      }
    });

    doc.save(`relatorio-cliente-${this.getPeriodLabel().replace(/ /g, '-')}.pdf`);
  }

  private loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private getPeriodLabel(): string {
    return `${this.formatPdfDate(this.startDate)} a ${this.formatPdfDate(this.endDate)}`;
  }

  private formatPdfDate(date: string | null): string {
    if (!date) return '—';
    const [year, month, day] = date.substring(0, 10).split('-');
    return `${day}/${month}/${year}`;
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
