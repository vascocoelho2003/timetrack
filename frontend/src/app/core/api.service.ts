import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Team,
  TeamMember,
  Project,
  TaskList,
  Task,
  TimeEntry,
  ReportData,
  Comment,
  Task_proj,
  User,
  colaboratorReport,
  DashboardData,
  project_report,
  IndividualClientReport,
  todo_tasks,
  my_projects,
  userProjectsDetails,
  ColaboratorReportDetails,
  Department,
  Client,
  TaskDependency,
  DependencyType,
  personal_report,
  ClientReport,
  getDepartment,
  ColaboratorClientReport,
  AdminDashboard,
  AdminUser,
  AdminDepartment,
  AdminTeam,
  AdminProject,
} from './models';
import { environment } from '../../environments/environments';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  //TEAMS
  /**
   * Chama o endpoint que retorna todas as equipas
   * @returns 
   */
  getTeams() {
    return this.http.get<Team[]>(`${API}/teams`);
  }

  /**
   * Chama o endpoint que cria uma equipa
   * @param name 
   * @returns 
   */
  createTeam(name: string) {
    return this.http.post<Team>(`${API}/teams`, { name });
  }

  /**
   * Chama o endpoint que elimina a equipa do id que é enviado por parâmetro
   * @param teamId 
   * @returns 
   */
  deleteTeam(teamId: number) {
    return this.http.delete(`${API}/teams/${teamId}`);
  }

  /**
   * Chama o endpoint que obtém os membros da equipa do ID que é enviado por parâmetro
   * @param teamId 
   * @returns 
   */
  getTeamMembers(teamId: number) {
    return this.http.get<TeamMember[]>(`${API}/teams/${teamId}/members`);
  }

  /**
   * Chama o endpoint que adiciona o membro do email que é enviado no body do request à equipa do ID que é enviado por parâmetro
   * @param teamId 
   * @param email 
   * @param role 
   * @returns 
   */
  addTeamMember(teamId: number, email: string, role: string) {
    return this.http.post<TeamMember>(`${API}/teams/${teamId}/members`, {
      email,
      role,
    });
  }

  /**
   * Remove o membro (userId) da equipa (teamId) 
   * @param teamId 
   * @param userId 
   * @returns 
   */
  removeTeamMember(teamId: number, userId: number) {
    return this.http.delete(`${API}/teams/${teamId}/members/${userId}`);
  }

  // Projects
  /**
   * Obtém os projetos da equipa do id que é enviado por parâmetro
   * @param teamId 
   * @returns 
   */
  getProjects(teamId: number) {
    return this.http.get<Project[]>(`${API}/projects/team/${teamId}`);
  }

  /**
   * Cria um projeto na equipa do ID que é enviado por parâmetro
   * @param teamId 
   * @param name 
   * @param description 
   * @returns 
   */
  createProject(teamId: number, name: string, description: string) {
    return this.http.post<Project>(`${API}/projects/team/${teamId}`, {
      name,
      description,
    });
  }

  /**
   * Obtém o projeto através do ID que é enviado por parâmetro
   * @param projectId 
   * @returns 
   */
  getProject(projectId: number) {
    return this.http.get<Project>(`${API}/projects/${projectId}`);
  }

  /**
   * Elimina o projeto através do ID que é enviado por parâmetro
   * @param projectId 
   * @returns 
   */
  deleteProject(projectId: number) {
    return this.http.delete(`${API}/projects/${projectId}`);
  }

  // Task lists
  /**
   * Obtém as Tasklists do projeto do ID que é enviado por parâmetro
   * @param projectId 
   * @returns 
   */
  getTaskLists(projectId: number) {
    return this.http.get<TaskList[]>(`${API}/task-lists/project/${projectId}`);
  }

  /**
   * Cria uma Tasklist com o name enviado através do body do request
   * @param projectId 
   * @param name 
   * @returns 
   */
  createTaskList(projectId: number, name: string) {
    return this.http.post<TaskList>(`${API}/task-lists/project/${projectId}`, {
      name,
    });
  }

  /**
   * Elimina a Tasklist através do ID enviado por parâmetro
   * @param listId 
   * @returns 
   */
  deleteTaskList(listId: number) {
    return this.http.delete(`${API}/task-lists/${listId}`);
  }

  /**
   * obtém as tarefas da tasklist com o ID enviado por parâmetro
   * @param listId 
   * @returns 
   */
  getTasks(listId: number) {
    return this.http.get<Task[]>(`${API}/task-lists/${listId}/tasks`);
  }

  // Tasks
  /**
   * Obtém a tarefa com o taskID enviado por parâmetro
   * @param taskId 
   * @returns 
   */
  getTask(taskId: number) {
    return this.http.get<Task>(`${API}/tasks/${taskId}`);
  }

  /**
   * Cria uma tarefa com os campo enviados no body do request
   * @param data 
   * @returns 
   */
  createTask(data: {
    taskListId: number;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    alertDate?: string | null;
    assigneeIds?: number[];
    parentTaskId?: number | null;
  }) {
    return this.http.post<Task>(`${API}/tasks`, data);
  }

  /**
   * Obtém apenas as tarefas fechadas do projeto com o ID enviado por parâmetro
   * @param projectId 
   * @returns 
   */
  getClosedTasks(projectId: number) {
    return this.http.get<Task[]>(`${API}/tasks/${projectId}/get_closed_tasks`);
  }

  /**
   * Atualiza os dados da tarefa com o ID enviado por parâmetro
   * @param taskId 
   * @param data 
   * @returns 
   */
  updateTask(taskId: number, data: Record<string, unknown>) {
    return this.http.put<Task>(`${API}/tasks/${taskId}`, data);
  }

  /**
   * Elimina a tarefa com o id enviado por parâmetro
   * @param taskId 
   * @returns 
   */
  deleteTask(taskId: number) {
    return this.http.delete(`${API}/tasks/${taskId}`);
  }

  /**
   * Adiciona um comentário à tarefa com o ID enviado por parâmetro
   * @param taskId 
   * @param content 
   * @returns 
   */
  addComment(taskId: number, content: string) {
    return this.http.post<Comment>(`${API}/tasks/${taskId}/comments`, {
      content,
    });
  }

  /**
   * Elimina o comentário com o ID enviado por parâmetro da tarefa com o taskID
   * @param taskId 
   * @param commentId 
   * @returns 
   */
  deleteComment(taskId: number, commentId: number) {
    return this.http.delete(`${API}/tasks/${taskId}/comments/${commentId}`);
  }

  /**
   * Cria uma recurrencia para a tarefa com o ID enviado por parâmetro 
   * @param taskId 
   * @param data 
   * @returns 
   */
  createRecurrence(taskId: number, data: Record<string, unknown>) {
    return this.http.post<{ message: string; recurrence: unknown }>(
      `${API}/tasks/recurrence/${taskId}`,
      data,
    );
  }

  /**
   * Atualiza a recurrencia de uma tarefa 
   * @param taskId 
   * @param data 
   * @returns 
   */
  updateRecurrence(taskId: number, data: Record<string, unknown>) {
    return this.http.put<{ message: string; recurrence: unknown }>(
      `${API}/tasks/recurrence/${taskId}`,
      data,
    );
  }

  /**
   * Obtem as dependencias de uma tarefa
   * @param taskId 
   * @returns 
   */
  getTaskDependencies(taskId: number) {
    return this.http.get<TaskDependency[]>(
      `${API}/tasks/${taskId}/dependencies`,
    );
  }

  /**
   * Cria dependência para a tarefa com o id enviado por parâmetro
   * @param taskId 
   * @param predecessor 
   * @param dependency_type 
   * @returns 
   */
  createDependency(
    taskId: number,
    predecessor: number,
    dependency_type: DependencyType,
  ) {
    return this.http.post<TaskDependency>(
      `${API}/tasks/create_dependency/${taskId}`,
      {
        predecessor,
        dependency_type,
      },
    );
  }

  /**
   * Atualiza a dependência da tarefa com o ID enviado por parâmetro
   * @param taskId 
   * @param predecessor 
   * @param dependency_type 
   * @returns 
   */
  updateDependency(
    taskId: number,
    predecessor: number,
    dependency_type: DependencyType,
  ) {
    return this.http.put<TaskDependency>(
      `${API}/tasks/update_dependency/${taskId}`,
      {
        predecessor,
        dependency_type,
      },
    );
  }

  //TIMER
  /**
   * Inicia o Timer
   * @param taskId 
   * @returns 
   */
  startTimer(taskId?: number) {
    return this.http.post<TimeEntry>(
      `${API}/time/start`,
      taskId ? { taskId } : {},
    );
  }

  /**
   * Para o timer
   * @returns 
   */
  stopTimer() {
    return this.http.post<TimeEntry>(`${API}/time/stop`, {});
  }

  /**
   * Obtém o timer que está ativo
   * @returns 
   */
  getActiveTimer() {
    return this.http.get<TimeEntry | null>(`${API}/time/active`);
  }

  /**
   * Obtém o timer que ainda não está atribuido a nenhuma tarefa
   * @returns 
   */
  getPendingUnassignedTimer() {
    return this.http.get<TimeEntry | null>(`${API}/time/unassigned/pending`);
  }

  /**
   * Atribuí um timer que ainda nao tinha sido atribuído
   * @param entryId 
   * @param data 
   * @returns 
   */
  assignUnassignedTimer(
    entryId: number,
    data: {
      existingTaskId?: number;
      title?: string;
      description?: string;
      taskListId?: number | null;
      priority?: string;
      dueDate?: string | null;
    },
  ) {
    return this.http.post<Task>(
      `${API}/time/unassigned/${entryId}/assign`,
      data,
    );
  }

  /**
   * Elimina um timer que ainda não foi atribuída a nenhuma tarefa
   * @param entryId 
   * @returns 
   */
  discardUnassignedTimer(entryId: number) {
    return this.http.delete(`${API}/time/unassigned/${entryId}`);
  }

  /**
   * Obtém as time entries de uma tarefa
   * @param taskId 
   * @returns 
   */
  getTaskTimeEntries(taskId: number) {
    return this.http.get<TimeEntry[]>(`${API}/time/task/${taskId}`);
  }

  /**
   * Obtém os dados para o Team Report
   */
  getTeamReport(teamId: number) {
    return this.http.get<ReportData>(`${API}/time/reports/team/${teamId}`);
  }

  /**
   * Obtém os Membros de um projeto
   * @param projectId 
   * @returns 
   */
  getProjectMembers(projectId: number) {
    return this.http.get<User[]>(`${API}/projects/${projectId}/users`);
  }

  /**
   * Obtém os dados para a Dashboard
   * @returns 
   */
  getDashboard() {
    return this.http.get<DashboardData>(`${API}/dashboard`);
  }

  /**
   * Obtém as tarefas por fazer do utilizador
   * @returns 
   */
  getMyTodoTasks() {
    return this.http.get<todo_tasks[]>(`${API}/my-todo-tasks`);
  }

  /**
   * Obtém os projetos do utilizador
   * @returns 
   */
  getMyProjects() {
    return this.http.get<my_projects[]>(`${API}/my-projects`);
  }

  getUserProjects() {
    return this.http.get<Project[]>(`${API}/projects`);
  }

  /**
   * Obtém as tarefas do utilizador
   */
  getUserTasks() {
    return this.http.get<Task_proj[]>(`${API}/tasks/`);
  }

  /**
   * Obtém os detalhes do projeto
   * @returns 
   */
  getUserProjectDetails() {
    return this.http.get<userProjectsDetails[]>(
      `${API}/projects/userProjectsDetails`,
    );
  }

  /**
   * Obtém os dados para o Relatório de Projeto
   */
  getProjectReport(projectId: number, startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.http.get<project_report>(`${API}/project_report/${projectId}`, {
      params,
    });
  }

  /**
   * Obtém os dados para o Relatório de Colaborador
   * @returns 
   */
  getColaboratorReport() {
    return this.http.get<colaboratorReport[]>(`${API}/colaborators_reports`);
  }

  /**
   * Obtém os dados para os detalhes do Relatório de Colaborador
   * @param id 
   * @param startDate 
   * @param endDate 
   * @returns 
   */
  getColaboratorReportDetails(
    id: number,
    startDate?: string,
    endDate?: string,
  ) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.http.get<ColaboratorReportDetails[]>(
      `${API}/colaborator_report/${id}`,
      { params },
    );
  }

  // Carregar Departments
  /**
   * Obtém os Departamentos
   * @returns 
   */
  getDepartments() {
    return this.http.get<Department[]>(`${API}/departments/getDepartments`);
  }

  /**
   * Obtém o departamento do utilizador logado
   * @returns 
   */
  getMyDepartment() {
    return this.http.get<Department | null>(
      `${API}/departments/getMyDepartment`,
    );
  }

  /**
   * Obtém os clientes registados no
   * @returns 
   */
  getClients() {
    return this.http.get<Client[]>(`${API}/clients/getAllClients`);
  }

  /**
   * Obtém os dados para o Relatório geral de Clientes
   * @param startDate 
   * @param endDate 
   * @param department 
   * @returns 
   */
  getGeneralClientReport(
    startDate?: string,
    endDate?: string,
    department?: boolean,
  ) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    params['department'] = department ? 'true' : 'false';
    return this.http.get<ClientReport[]>(`${API}/reports/generalClientReport`, {
      params,
    });
  }

  /**
   * Obtém os dados para o Relatório Individual de Cliente
   * @param startDate 
   * @param endDate 
   * @param user_id 
   * @param department 
   * @returns 
   */
  getIndividualClientReport(
    startDate?: string,
    endDate?: string,
    user_id?: number,
    department?: boolean,
  ) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    if (department) params['department'] = department ? 'true' : 'false';
    return this.http.get<IndividualClientReport[]>(
      `${API}/reports/ClientReport/${user_id}`,
      { params },
    );
  }

  /**
   * Obtém os dados para o Relatório de Cliente (Departamento)
   * @param user_id 
   * @returns 
   */
  getClientDepartment(user_id: number) {
    return this.http.get<getDepartment>(`${API}/auth/getDepartment`);
  }

  /**
   * Obtém os dados para o Relatório individual
   * @param startDate 
   * @param endDate 
   * @returns 
   */
  getPersonalReport(startDate?: string, endDate?: string) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.http.get<personal_report[]>(
      `${API}/reports/ColaboratorReport`,
      { params },
    );
  }

  /**
   * Obtém os dados para o Colaborato Client Report
   * @param startDate 
   * @param endDate 
   * @param client_id 
   * @returns 
   */
  getColaboratorClientReport(
    startDate?: string,
    endDate?: string,
    client_id?: number,
  ) {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.http.get<ColaboratorClientReport[]>(
      `${API}/reports/ColaboratorClientReport/${client_id}`,
      { params },
    );
  }

  /**
   * Obtém os dados da Dashboard do Admin
   * @returns 
   */
  getAdminDashboard() {
    return this.http.get<AdminDashboard>(`${API}/admin/dashboard`);
  }

  /**
   * Obtém os utilizadores com o perfil de Admin
   * @returns 
   */
  getAdminUsers() {
    return this.http.get<AdminUser[]>(`${API}/admin/users`);
  }

  /**
   * Obtém um utilizador do tipo admin com o user enviado por parâmetro
   * @param userId 
   * @returns 
   */
  getAdminUser(userId: number) {
    return this.http.get<AdminUser>(`${API}/admin/users/${userId}`);
  }

  /**
   * Cria um user com o perfil de Admin
   * @param data 
   * @returns 
   */
  createAdminUser(data: {
    username: string;
    email: string;
    password: string;
    passwordConfirm: string;
    department_id: number;
    profile: 'admin' | 'user';
  }) {
    return this.http.post<AdminUser>(`${API}/admin/users`, data);
  }

  /**
   * Atualiza um utilizador com perfil Admin
   * @param userId 
   * @param data 
   * @returns 
   */
  updateAdminUser(
    userId: number,
    data: {
      username: string;
      email: string;
      department_id: number;
      profile: 'admin' | 'user';
      password?: string;
    },
  ) {
    return this.http.put<{ user: AdminUser; token?: string }>(
      `${API}/admin/users/${userId}`,
      data,
    );
  }

  /**
   * Ativa/Desativa um utilizador de perfil Admin
   * @param userId 
   * @param active 
   * @returns 
   */
  setAdminUserActive(userId: number, active: boolean) {
    return this.http.put<AdminUser>(`${API}/admin/users/${userId}/active`, {
      active,
    });
  }

  /**
   * Obtém os departamentos para a página Departments do admin
   * @returns 
   */
  getAdminDepartments() {
    return this.http.get<AdminDepartment[]>(`${API}/admin/departments`);
  }

  /**
   * Obtém as equipas para a página Equipas do Admin
   * @returns 
   */
  getAdminTeams() {
    return this.http.get<AdminTeam[]>(`${API}/admin/teams`);
  }

  /**
   * Obtém os projeto para a página projects do Admin
   * @returns 
   */
  getAdminProjects() {
    return this.http.get<AdminProject[]>(`${API}/admin/projects`);
  }

  /**
   * Cria um Departamento
   * @param name 
   * @returns 
   */
  createDepartment(name: string) {
    return this.http.post(`${API}/departments/createDepartment`, { name });
  }
}
