import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { FormsModule } from '@angular/forms';
import { project_report } from '../../core/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  }

  async exportPdf(): Promise<void> {
    if (!this.dados) {
      return;
    }

    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth();
    const margin = 20;
    const logo = await this.loadImage('/JCR_logotipo.png');

    if (logo) {
      const logoWidth = 15;
      const logoHeight = logoWidth * (logo.height / logo.width);
      document.addImage(logo, 'PNG', margin, 14, logoWidth, logoHeight);
    }

    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.text('JC Ribeiro Task Management', pageWidth - margin, 20, { align: 'right' });

    
    document.setFont('helvetica', 'bold');
    document.setFontSize(12);
    document.text('Relatório de Registos de Tempo de Projeto', margin, 43);

    document.setFontSize(8);
    document.text(`Equipa: ${this.dados.project.team_name || '—'}`, margin, 52);
    document.text(`Projeto: ${this.dados.project.name}`, margin, 59);
    document.text(`Período: ${this.getReportPeriodLabel()}`, margin, 66);

    let currentY = 79;
    const lists = this.dados.task_lists.filter(list => list.tasks.length > 0);

    if (!lists.length) {
      document.setFont('helvetica', 'normal');
      document.text('Sem tarefas', margin + 8, currentY);
    }

    for (const list of lists) {
      autoTable(document, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[
          `Lista de Tarefas: ${list.name}`,
          'Colaborador/Tempo',
          'Estado',
          'Prazo',
          'Tempo Total'
        ]],
        body: list.tasks.map(task => [
          task.title,
          task.assignees
            .map(assignee => `${assignee.username} (${this.formatDuration(assignee.time)})`)
            .join('\n') || '—',
          this.getStatusLabel(task.status),
          this.formatPdfDate(task.due_date),
          this.formatDuration(task.total_time)
        ]),
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 7,
          textColor: [25, 25, 25],
          cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
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
          0: { cellWidth: 58 },
          1: { cellWidth: 48 },
          2: { cellWidth: 28 },
          3: { cellWidth: 25 },
          4: { cellWidth: 27 }
        },
        didParseCell: data => {
          if (data.section === 'body' && data.column.index === 0) {
            data.cell.styles.cellPadding = { top: 2.5, right: 2, bottom: 2.5, left: 10 };
          }
        }
      });

      currentY = (document as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (document as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
        : currentY + 15;
    }

    document.save(`relatorio-projeto-${this.sanitizeFileName(this.dados.project.name)}.pdf`);
  }

  private loadImage(source: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = source;
    });
  }

  private getReportPeriodLabel(): string {
    if (!this.startDate || !this.endDate) {
      return 'Todos os períodos';
    }

    return `${this.formatPdfDate(this.startDate)} a ${this.formatPdfDate(this.endDate)}`;
  }

  private formatPdfDate(date: string | null): string {
    if (!date) {
      return '—';
    }

    const [year, month, day] = date.substring(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  private getStatusLabel(status: string): string {
    return {
      todo: 'Por Fazer',
      doing: 'Em Progresso',
      done: 'Concluída'
    }[status] || status;
  }

  private sanitizeFileName(name: string): string {
    return name.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, '-');
  }
}
