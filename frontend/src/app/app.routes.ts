import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'teams', loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent), canActivate: [authGuard] },
  { path: 'teams/:id', loadComponent: () => import('./pages/team/team.component').then(m => m.TeamComponent), canActivate: [authGuard] },
  { path: 'teams/:id/reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent), canActivate: [authGuard] },
  { path: 'projects/:id', loadComponent: () => import('./pages/project/project.component').then(m => m.ProjectComponent), canActivate: [authGuard] },
  { path: 'projects/:id/closed-tasks', loadComponent: () => import('./pages/closed-tasks/closed-tasks.component').then(m => m.ClosedTasksComponent), canActivate: [authGuard] },
];
