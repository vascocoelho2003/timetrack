import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Team, TeamMember, Project, TaskList, Task, TimeEntry, ReportData, Comment,Task_proj,
  User, colaboratorReport,
  DashboardData,project_report,
  todo_tasks,
  my_projects, userProjectsDetails,
  ColaboratorReportDetails,
} from './models';
import {environment} from '../../environments/environments';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Teams
  getTeams() { return this.http.get<Team[]>(`${API}/teams`); }
  createTeam(name: string) { return this.http.post<Team>(`${API}/teams`, { name }); }
  deleteTeam(teamId: number) { return this.http.delete(`${API}/teams/${teamId}`); }
  getTeamMembers(teamId: number) {
    return this.http.get<TeamMember[]>(`${API}/teams/${teamId}/members`);
  }
  addTeamMember(teamId: number, email: string, role: string) {
    return this.http.post<TeamMember>(`${API}/teams/${teamId}/members`, { email, role });
  }
  removeTeamMember(teamId: number, userId: number) {
    return this.http.delete(`${API}/teams/${teamId}/members/${userId}`);
  }

  // Projects
  getProjects(teamId: number) {
    return this.http.get<Project[]>(`${API}/projects/team/${teamId}`);
  }
  createProject(teamId: number, name: string, description: string) {
    return this.http.post<Project>(`${API}/projects/team/${teamId}`, { name, description });
  }
  getProject(projectId: number) {
    return this.http.get<Project>(`${API}/projects/${projectId}`);
  }
  deleteProject(projectId: number) {
    return this.http.delete(`${API}/projects/${projectId}`);
  }

  // Task lists
  getTaskLists(projectId: number) {
    return this.http.get<TaskList[]>(`${API}/task-lists/project/${projectId}`);
  }
  createTaskList(projectId: number, name: string) {
    return this.http.post<TaskList>(`${API}/task-lists/project/${projectId}`, { name });
  }
  deleteTaskList(listId: number) {
    return this.http.delete(`${API}/task-lists/${listId}`);
  }
  getTasks(listId: number) {
    return this.http.get<Task[]>(`${API}/task-lists/${listId}/tasks`);
  }

  // Tasks
  getTask(taskId: number) { return this.http.get<Task>(`${API}/tasks/${taskId}`); }
  createTask(data: {
    taskListId: number;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    assigneeIds?: number[];
    parentTaskId?: number | null;
  }) {
    return this.http.post<Task>(`${API}/tasks`, data);
  }
  getClosedTasks(projectId: number) {
    return this.http.get<Task[]>(`${API}/tasks/${projectId}/get_closed_tasks`);
  }
  updateTask(taskId: number, data: Record<string, unknown>) {
    return this.http.put<Task>(`${API}/tasks/${taskId}`, data);
  }
  deleteTask(taskId: number) {
    return this.http.delete(`${API}/tasks/${taskId}`);
  }
  addComment(taskId: number, content: string) {
    return this.http.post<Comment>(`${API}/tasks/${taskId}/comments`, { content });
  }
  deleteComment(taskId: number, commentId: number) {
    return this.http.delete(`${API}/tasks/${taskId}/comments/${commentId}`);
  }
  createRecurrence(taskId: number, data: Record<string, unknown>) {
    return this.http.post<{ message: string }>(`${API}/tasks/recurrence/${taskId}`, data);
  }

  // Time
  startTimer(taskId: number) {
    return this.http.post<TimeEntry>(`${API}/time/start`, { taskId });
  }
  stopTimer() { return this.http.post<TimeEntry>(`${API}/time/stop`, {}); }
  getActiveTimer() { return this.http.get<TimeEntry | null>(`${API}/time/active`); }
  getTaskTimeEntries(taskId: number) {
    return this.http.get<TimeEntry[]>(`${API}/time/task/${taskId}`);
  }
  getTeamReport(teamId: number) {
    return this.http.get<ReportData>(`${API}/time/reports/team/${teamId}`);
  }

  getProjectMembers(projectId: number){
    return this.http.get<User[]>(`${API}/projects/${projectId}/users`);
  }

  getDashboard(){
    return this.http.get<DashboardData>(`${API}/dashboard`);
  }

  getMyTodoTasks(){
    return this.http.get<todo_tasks[]>(`${API}/my-todo-tasks`);
  }

  getMyProjects(){
    return this.http.get<my_projects[]>(`${API}/my-projects`);
  }

  getUserProjects(){
    return this.http.get<Project[]>(`${API}/projects`);
  }

  getUserTasks(){
    return this.http.get<Task_proj[]>(`${API}/tasks/`);
  }

  getUserProjectDetails(){
    return this.http.get<userProjectsDetails[]>(`${API}/projects/userProjectsDetails`);
  }

  getProjectReport(projectId: number, startDate?: string, endDate?: string){
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.http.get<project_report>(`${API}/project_report/${projectId}`, { params });
  }

  getColaboratorReport(){
    return this.http.get<colaboratorReport[]>(`${API}/colaborators_reports`);
  }

  getColaboratorReportDetails(id: number, startDate?: string, endDate?: string){
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;

    return this.http.get<ColaboratorReportDetails[]>(`${API}/colaborator_report/${id}`, { params });
  }

}
