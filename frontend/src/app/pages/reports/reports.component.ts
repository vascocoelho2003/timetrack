import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { my_projects, todo_tasks, User } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reports',
  imports: [RouterLink,CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css'
})
export class ReportsComponent implements OnInit {
  user: User | undefined;
  nr_equipas = 0 ;
  nr_projetos = 0;
  total_tasks = 0;
  todo_tasks = 0 ;
  closed_tasks = 0 ;
  total_hours = 0;
  overdue_tasks = 0;
  high_priority_tasks = 0;
  todo_task : todo_tasks [] = [];
  my_projects: my_projects  [] = [];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.user = this.authService.currentUser() ?? undefined;
    this.apiService.getDashboard().subscribe({
      next: (data)=>{
        this.nr_equipas = data.total_teams ?? 0;
        this.nr_projetos = data.total_projects ?? 0;
        this.total_tasks = data.total_tasks ?? 0;
        this.todo_tasks = data.todo_tasks ?? 0;
        this.closed_tasks = data.closed_tasks ?? 0;
        this.total_hours = data.total_hours ?? 0;
        this.overdue_tasks = data.overdua_tasks ?? 0;
        this.high_priority_tasks = data.high_priority_tasks ?? 0;
      },
      error: (error) => {
        console.log("Erro ao carregar dashboard", error);
      }});
    this.apiService.getMyTodoTasks().subscribe({
      next: (data) => {
        this.todo_task = data;
      },
      error: (error) => {
        console.log("Erro ao carregar as todo tasks", error);
      }});
    this.apiService.getMyProjects().subscribe({
      next: (data)=> {
        this.my_projects = data;
      }
    })
  }

  formatHours(hours: number): string {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
  
    return `${h}:${m.toString().padStart(2, '0')}`;
  }
}
