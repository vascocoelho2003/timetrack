import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'reports', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'teams', loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent), canActivate: [authGuard] },
  { path: 'teams/:id', loadComponent: () => import('./pages/team/team.component').then(m => m.TeamComponent), canActivate: [authGuard], pathMatch: 'full' },
  { path: 'projects/:id', loadComponent: () => import('./pages/project/project.component').then(m => m.ProjectComponent), canActivate: [authGuard], pathMatch: 'full' },
  { path: 'projects/:id/closed-tasks', loadComponent: () => import('./pages/closed-tasks/closed-tasks.component').then(m => m.ClosedTasksComponent), canActivate: [authGuard] },
  { path: 'my-tasks', loadComponent: () => import('./pages/my-tasks/my-tasks.component').then(m => m.MyTasksComponent), canActivate: [authGuard] },
  { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent), canActivate: [authGuard] },
  { path: 'projects-reports', loadComponent: () => import('./pages/projects-reports/projects-reports.component').then(m => m.ProjectsReportsComponent), canActivate: [authGuard] },
  { path: 'colaborators-reports', loadComponent: () => import('./pages/colaborators-reports/colaborators-reports.component').then(m => m.ColaboratorsReportsComponent), canActivate: [authGuard] },
  { path: 'my_projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent), canActivate: [authGuard] },
  { path: 'project-report/:id', loadComponent: () => import('./pages/project-report/project-report.component').then(m => m.ProjectReportComponent), canActivate: [authGuard] },
  { path: 'colaborator-report/:id', loadComponent: () => import('./pages/colaborator-report/colaborator-report.component').then(m => m.ColaboratorReportComponent), canActivate: [authGuard] },
];
