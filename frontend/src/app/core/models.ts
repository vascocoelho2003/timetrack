export interface User {
  id: number;
  email: string;
  username: string;
}

export interface DashboardData {
  id: number;
  username: string;
  total_teams: number;
  total_projects: number;
  total_tasks: number;
  todo_tasks: number;
  closed_tasks: number;
  total_hours: number;
  overdue_tasks: number;
  high_priority_tasks: number;
}

export interface colaboratorReport{
  user_id: number;
  username: string;
  nr_tasks: number;
  nr_closed_tasks: number;
  total_time: number; 
}

export interface userProjectsDetails{
  id: number;
  name: string;
  description: string;
  team_id: number;
  team_name: string;
  members: User[];
  todo_tasks: number;
  done_tasks: number;
}

export interface projectForReport{
  id: number;
  name: string;
}

export interface assigneesForReport{
  id: number;
  username: string;
  time: number;
}

export interface taskForReport{
  id: number;
  title: string;
  status: string;
  due_date: string | null;
  total_time: number;
  assignees : assigneesForReport[];
}

export interface tasklistForReport{
  id: number;
  name: string;
  tasks: taskForReport[];
}

export interface project_report{
  project: projectForReport;
  task_lists : tasklistForReport [];
}

export interface todo_tasks {
  title: string;
  due_date: string;
}

export interface my_projects {
  project_name: string;
  team_name: string;
}

export interface Team {
  id: number;
  name: string;
  created_by: number;
  role: 'admin' | 'member';
}

export interface TeamModel {
  id: number;
  name: string;
}


export interface TeamMember extends User {
  role: 'admin' | 'member';
}

export interface Project {
  id: number;
  team_id: number;
  name: string;
  description: string;
}

export interface TaskList {
  id: number;
  project_id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  task_list_id: number;
  parent_task_id: number | null;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assigneeIds: number[];
  subtasks?: Task[];
  comments?: Comment[];
  assignees: User[];
}

export interface Task_proj {
  id: number;
  team_id: number;
  project_id: number;
  task_list_name: string,
  project_name: string;
  task_list_id: number;
  parent_task_id: number | null;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assigneeIds: number[];
  subtasks?: Task[];
  comments?: Comment[];
  assignees: User[];
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  user_name: string;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  task_id: number;
  start: string;
  end: string | null;
  duration: number | null;
  task_title?: string;
  user_name?: string;
}

export interface ReportData {
  byUser: { id: number; name: string; total_seconds: number }[];
  byProject: { id: number; name: string; total_seconds: number }[];
  byTask: { id: number; title: string; total_seconds: number }[];
}
