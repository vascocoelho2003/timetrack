import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Team, TeamMember, Project, TaskList, Task, TimeEntry, ReportData, Comment,
} from './models';

const API = 'http://localhost:3000/api';

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
}
