import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ColaboratorReportDetails } from '../../core/models';
import { ApiService } from '../../core/api.service';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-colaborator-report',
  imports: [RouterLink, FormsModule],
  templateUrl: './colaborator-report.component.html',
  styleUrl: './colaborator-report.component.css'
})
export class ColaboratorReportComponent implements OnInit{
  colaboradores : ColaboratorReportDetails [] = [];
  groupedColaboradores: { projectName: string; taskListName: string; tasks: ColaboratorReportDetails[] }[] = [];
  totalTime = 0;
  username = '';
  colaboratorId = 0;
  selectedPeriod = 'custom';
  startDate = '';
  endDate = '';

  constructor(private route: ActivatedRoute, private apiService: ApiService) {
    this.route.queryParamMap.subscribe(params => {
      this.totalTime = Number(params.get('total_time')) || 0;
      this.username = params.get('username') || '';
    });
    this.colaboratorId = Number(this.route.snapshot.paramMap.get('id')) || 0;
  }

  ngOnInit(): void {
    if (!this.colaboratorId) {
      return;
    }
    this.loadReport();
  }

  loadReport(): void {
    const dates = this.selectedPeriod === 'custom'
      ? { startDate: this.startDate, endDate: this.endDate }
      : this.getPeriodDates(this.selectedPeriod);

    this.apiService.getColaboratorReportDetails(
      this.colaboratorId,
      dates.startDate,
      dates.endDate
    ).subscribe(data => {
      this.colaboradores = data;
      this.groupedColaboradores = this.groupByProjectAndTaskList(data);
      this.totalTime = data.reduce((total, entry) => total + (entry.duration || 0), 0);
    });
  }

  onPeriodChange(): void {
    if (this.selectedPeriod !== 'custom') {
      const dates = this.getPeriodDates(this.selectedPeriod);
      this.startDate = dates.startDate;
      this.endDate = dates.endDate;
      this.loadReport();
    }
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

  private groupByProjectAndTaskList(tasks: ColaboratorReportDetails[]) {
    const groups = new Map<string, { projectName: string; taskListName: string; tasks: ColaboratorReportDetails[] }>();

    tasks.forEach(task => {
      const projectName = task.project_name || 'Projeto sem nome';
      const taskListName = task.task_list_name || 'Lista sem nome';
      const key = `${projectName}\u0000${taskListName}`;
      const group = groups.get(key);

      if (group) {
        const existingTask = group.tasks.find(groupTask => groupTask.task_id === task.task_id);
        if (existingTask) {
          existingTask.duration += task.duration || 0;
        } else {
          group.tasks.push(task);
        }
      } else {
        groups.set(key, { projectName, taskListName, tasks: [task] });
      }
    });

    return Array.from(groups.values());
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  formatDate(dateString: string) {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
}

  async exportPdf(): Promise<void> {
    const document = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth();
    const margin = 12;
    const logo = await this.loadImage('/logo.png');

    if (logo) {
      const logoWidth = 42;
      const logoHeight = logoWidth * (logo.height / logo.width);
      document.addImage(logo, 'PNG', margin, 14, logoWidth, logoHeight);
    }

    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.text('JC Ribeiro Task Management', pageWidth - margin, 20, { align: 'right' });

    document.setFont('helvetica', 'bold');
    document.setFontSize(12);
    document.text('Relatório de Registos de Tempo de Colaborador', margin, 36);
    document.setFontSize(8);
    document.text(`Colaborador: ${this.username || '—'}`, margin, 45);
    document.text(`Total de Tempo Registado: ${this.formatDuration(this.totalTime)}`, margin, 52);
    document.text(`Período: ${this.getReportPeriodLabel()}`, margin, 59);

    let currentY = 74;
    let currentProject = '';

    for (const group of this.groupedColaboradores) {
      if (group.projectName !== currentProject) {
        if (currentProject) {
          currentY += 6;
        }

        document.setFont('helvetica', 'bold');
        document.setFontSize(9);
        document.text(group.projectName, margin + 2, currentY);
        document.setLineWidth(0.25);
        document.line(margin + 2, currentY + 1, margin + 35, currentY + 1);
        currentY += 12;
        currentProject = group.projectName;
      }

      autoTable(document, {
        startY: currentY,
        margin: { left: margin + 16, right: margin + 12 },
        head: [[
          `Lista de Tarefas: ${group.taskListName}`,
          'Colaborador/Tempo',
          'Estado',
          'Prazo'
        ]],
        body: group.tasks.map(task => [
          task.title,
          `${this.username || '—'} (${this.formatDuration(task.duration)})`,
          this.getStatusLabel(task.status),
          this.formatPdfDate(task.start)
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
          lineWidth: { top: 0.25, bottom: 0, left: 0, right: 0 }
        },
        columnStyles: {
          0: { cellWidth: 63 },
          1: { cellWidth: 43 },
          2: { cellWidth: 24 },
          3: { cellWidth: 27 }
        },
        didParseCell: data => {
          if (data.section === 'body' && data.column.index === 0) {
            data.cell.styles.cellPadding = { top: 2.5, right: 2, bottom: 2.5, left: 10 };
          }
        }
      });

      currentY = (document as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
        ? (document as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
        : currentY + 15;
    }

    if (!this.groupedColaboradores.length) {
      document.setFont('helvetica', 'normal');
      document.text('Não foram encontrados registos de tempo.', margin + 2, currentY);
    }

    document.save(`relatorio-colaborador-${this.sanitizeFileName(this.username || 'sem-nome')}.pdf`);
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
      done: 'Concluído'
    }[status] || status;
  }

  private sanitizeFileName(name: string): string {
    return name.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, '-');
  }
}
