import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColaboratorClientReport } from '../../core/models';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-colaborator-client-report',
  imports: [FormsModule],
  templateUrl: './colaborator-client-report.component.html',
  styleUrl: './colaborator-client-report.component.css'
})
export class ColaboratorClientReportComponent implements OnInit {
  client_id = 0;
  username = '';
  cliente_username = '';
  startDate = '';
  endDate = '';
  page = 1;
  pageSize = 10;
  tasks: ColaboratorClientReport[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const state = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    this.client_id = state?.['id'] ?? 0;
    this.cliente_username = state?.['name'] ?? '';
    this.username = this.authService.currentUser()?.username ?? '';
    const now = new Date();
    this.startDate = state?.['startDate'] || `${now.getFullYear()}-01-01`;
    this.endDate = state?.['endDate'] || this.toDateInput(now);
    this.loadReport();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tasks.length / this.pageSize));
  }

  get pagedTasks(): ColaboratorClientReport[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.tasks.slice(start, start + this.pageSize);
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
    doc.text('Relatório Pessoal por Cliente', margin, 43);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Colaborador: ${this.username || '—'}`, margin, 52);
    doc.text(`Cliente: ${this.cliente_username || '—'}`, margin, 59);
    doc.text(`Período: ${this.getPeriodLabel()}`, margin, 66);

    autoTable(doc, {
      startY: 77,
      margin: { left: margin, right: margin },
      head: [['Tarefa', 'Estado', 'Última Atualização', 'Prazo', 'Tempo Despendido']],
      body: this.tasks.map(t => [
        t.title,
        this.statusLabel(t.status),
        this.formatDate(t.ultima_atualizacao),
        this.formatDate(t.due_date),
        this.formatDuration(t.duration)
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        textColor: [25, 25, 25],
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
        lineColor: [210, 210, 210],
        lineWidth: 0.15,
        overflow: 'linebreak'
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [25, 25, 25],
        lineColor: [110, 110, 110],
        lineWidth: { top: 0.25, bottom: 0.25, left: 0, right: 0 }
      },
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    const safeName = (this.cliente_username || this.username).trim().replace(/[<>:"/\\|?*\s]/g, '-');
    doc.save(`relatorio-pessoal-${safeName}-${this.getPeriodLabel().replace(/ /g, '-')}.pdf`);
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

  onCustomDateChange(): void {
    if (this.startDate && this.endDate) {
      this.page = 1;
      this.loadReport();
    }
  }

  private toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  loadReport(): void {
    this.apiService.getColaboratorClientReport(this.startDate, this.endDate, this.client_id).subscribe({
      next: (data) => {
        this.tasks = data;
      }
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      todo: 'Por Fazer',
      doing: 'In Progress',
      done: 'Concluído'
    };
    return map[status] ?? status;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  formatDuration(seconds: number): string {
    const total = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }
}
