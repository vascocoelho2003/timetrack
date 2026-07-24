import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ColaboratorReportDetails } from '../../core/models';
import { ApiService } from '../../core/api.service';
import { FormsModule } from '@angular/forms';

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
}
