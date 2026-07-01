export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  created_by: number;
  role: 'admin' | 'member';
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
