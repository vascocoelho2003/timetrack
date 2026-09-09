import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, userGuard } from './core/auth.guard';
import { inject } from '@angular/core';
import { AuthService } from './core/auth.service';

export const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: () => { const auth = inject(AuthService); if (!auth.isLoggedIn) return '/login'; return auth.homePath;},},
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'admin-panel', loadComponent: () => import('./pages/admin-panel/admin-panel.component').then(m => m.AdminPanelComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin-panel/users', loadComponent: () => import('./pages/admin-users/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin-panel/users/:id', loadComponent: () => import('./pages/admin-user/admin-user.component').then(m => m.AdminUserComponent), canActivate: [authGuard, adminGuard] },

  { path: 'admin-panel/departments', loadComponent: () => import('./pages/admin-departments/admin-departments.component').then(m => m.AdminDepartmentsComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin-panel/teams', loadComponent: () => import('./pages/admin-teams/admin-teams.component').then(m => m.AdminTeamsComponent), canActivate: [authGuard, adminGuard] },
  { path: 'admin-panel/projects', loadComponent: () => import('./pages/admin-projects/admin-projects.component').then(m => m.AdminProjectsComponent), canActivate: [authGuard, adminGuard] },
  { path: 'teams', loadComponent: () => import('./pages/teams/teams.component').then(m => m.TeamsComponent), canActivate: [authGuard, userGuard] },
  { path: 'teams/:id', loadComponent: () => import('./pages/team/team.component').then(m => m.TeamComponent), canActivate: [authGuard, userGuard], pathMatch: 'full' },
  { path: 'projects/:id', loadComponent: () => import('./pages/project/project.component').then(m => m.ProjectComponent), canActivate: [authGuard, userGuard], pathMatch: 'full' },
  { path: 'projects/:id/closed-tasks', loadComponent: () => import('./pages/closed-tasks/closed-tasks.component').then(m => m.ClosedTasksComponent), canActivate: [authGuard, userGuard] },
  { path: 'my-tasks', loadComponent: () => import('./pages/my-tasks/my-tasks.component').then(m => m.MyTasksComponent), canActivate: [authGuard, userGuard] },
  { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent), canActivate: [authGuard, userGuard] },
  { path: 'projects-reports', loadComponent: () => import('./pages/projects-reports/projects-reports.component').then(m => m.ProjectsReportsComponent), canActivate: [authGuard, userGuard] },
  { path: 'colaborators-reports', loadComponent: () => import('./pages/colaborators-reports/colaborators-reports.component').then(m => m.ColaboratorsReportsComponent), canActivate: [authGuard, userGuard] },
  { path: 'my_projects', loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent), canActivate: [authGuard, userGuard] },
  { path: 'project-report/:id', loadComponent: () => import('./pages/project-report/project-report.component').then(m => m.ProjectReportComponent), canActivate: [authGuard, userGuard] },
  { path: 'colaborator-report/:id', loadComponent: () => import('./pages/colaborator-report/colaborator-report.component').then(m => m.ColaboratorReportComponent), canActivate: [authGuard, userGuard] },
  { path: 'my-profile', loadComponent: () => import('./pages/my-profile/my-profile.component').then(m => m.MyProfileComponent), canActivate: [authGuard] },
  { path: 'client-reports', loadComponent: () => import('./pages/client-reports/client-reports.component').then(m=>m.ClientReportsComponent), canActivate: [authGuard, userGuard]},
  { path: 'individual-client-report', loadComponent: () => import('./pages/individual-client-report/individual-client-report.component').then(m=>m.IndividualClientReportComponent), canActivate: [authGuard, userGuard]},
  { path: 'personal-report', loadComponent: () => import('./pages/personal-report/personal-report.component').then(m=>m.PersonalReportComponent), canActivate: [authGuard, userGuard]},
  { path: 'colaborator-client-report', loadComponent: () => import('./pages/colaborator-client-report/colaborator-client-report.component').then(m=>m.ColaboratorClientReportComponent), canActivate: [authGuard, userGuard]},
];
