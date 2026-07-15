import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TimerService, formatDuration } from '../../core/timer.service';
import { Project, TaskList, Task, TeamMember, TimeEntry, Comment } from '../../core/models';
import * as XLSX from 'xlsx';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import {MatCheckboxModule} from '@angular/material/checkbox';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-project',
  standalone: true,
<<<<<<< Updated upstream
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page project-page">
    
      <a [routerLink]="['/teams', project?.team_id]" class="back-link">← Equipa</a>
      <div class="page-header">
        <h2>{{ project?.name }}</h2>
        <div class="inline-form" style="gap:8px;">
          <button class="btn btn-ghost" [class.active]="viewMode === 'board'" (click)="viewMode = 'board'">Quadro</button>
          <button class="btn btn-ghost" [class.active]="viewMode === 'list'" (click)="viewMode = 'list'">Lista</button>
        </div>
        @if (isAdmin) {
          <button class="btn btn-ghost" (click)="showNewList = !showNewList">+ Lista</button>
          <button class="btn btn-ghost" [routerLink]="['/projects', project?.id, 'closed-tasks']">Closed Tasks</button>
          <button class="btn btn-danger btn-sm" (click)="deleteProject()" title="Eliminar projeto">Eliminar projeto</button>
        }
      </div>  
      <div class="inline-form file-upload-row" style="display:flex;align-items:center;gap:8px;">
        <input type="file" id="excelFile" accept=".xlsx,.xls" (change)="onFileSelected($event)" style="display:none;" />
        <label for="excelFile" class="btn btn-ghost">Escolher ficheiro</label>
        @if (selectedFileName) {
          <span class="muted">{{ selectedFileName }}</span>
        }
        <button class="btn btn-primary" (click)="submitExcel()" [disabled]="!selectedFile">Submeter</button>
      </div>
      
      @if (showNewList && isAdmin) {
        <div class="card inline-form">
          <input [(ngModel)]="newListName" placeholder="Nome da lista" />
          <button class="btn btn-primary" (click)="createList()">Criar</button>
        </div>
      }

      @if (viewMode === 'board') {
        <div class="board">
          @for (list of lists; track list.id) {
            <div class="board-column card">
              <div class="column-header">
                <h4>{{ list.name }}</h4>
                <div class="column-actions">
                  @if (isAdmin) {
                    <button class="btn-icon" (click)="openNewTask(list.id)" title="Nova tarefa">+</button>
                    <button class="btn-icon btn-danger" (click)="deleteList(list.id)" title="Eliminar lista">🗑</button>
                  }
                </div>
              </div>
              @for (task of tasksByList[list.id] || []; track task.id) {
                <div class="task-card" (click)="openTask(task.id)">
                  <div class="task-title">{{ task.title }}</div>
                  <div class="task-meta">
                  <div class="status-pill">{{ formatDate(task.due_date) }}</div>
                    <span class="status-pill" [attr.data-status]="task.status">{{ statusLabel(task.status) }}</span>
                    <span class="priority-pill" [attr.data-priority]="task.priority">{{ task.priority }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="card">
          <div class="inline-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px;">
            <input [(ngModel)]="listSearch" placeholder="Pesquisa" />
            <select [(ngModel)]="listFilterList">
              <option value="">Todas as listas</option>
              @for (list of lists; track list.id) {
                <option [value]="list.id">{{ list.name }}</option>
              }
            </select>
            <select [(ngModel)]="listFilterStatus">
              <option value="">Todos os estados</option>
              <option value="todo">Por fazer</option>
              <option value="doing">Em progresso</option>
            </select>
            <select [(ngModel)]="listFilterPriority">
              <option value="">Todas as prioridades</option>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <select [(ngModel)]="listFilterDueDate">
              <option value="">Todos os prazos</option>
              <option value="today">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="overdue">Atrasadas</option>
            </select>
          </div>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;font-weight:600;">
            <span>Tarefa</span>
            <span>Lista</span>
            <span>Estado</span>
            <span>Prazo</span>
            <span>Prioridade</span>
          </div>
          @for (entry of pagedListViewTasks; track entry.task.id) {
            <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid #f3f4f6;cursor:pointer;" (click)="openTask(entry.task.id)">
              <span>{{ entry.task.title }}</span>
              <span>{{ entry.listName }}</span>
              <span class="status-pill" [attr.data-status]="entry.task.status">{{ statusLabel(entry.task.status) }}</span>
              <span>{{ formatDate(entry.task.due_date) }}</span>
              <span class="priority-pill" [attr.data-priority]="entry.task.priority">{{ entry.task.priority }}</span>
            </div>
          }
          @if (totalListPages > 1) {
            <div class="inline-form" style="justify-content:center;margin-top:12px;gap:8px;">
              <button class="btn btn-ghost" [disabled]="listPage === 1" (click)="listPage = listPage - 1">Anterior</button>
              <span class="muted">Página {{ listPage }} de {{ totalListPages }}</span>
              <button class="btn btn-ghost" [disabled]="listPage === totalListPages" (click)="listPage = listPage + 1">Seguinte</button>
            </div>
          }
        </div>
      }

      @if (selectedTask) {
        <div class="modal-overlay" (click)="closeTask()">
          <div class="modal card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ isAdmin ? 'Editar tarefa' : 'Tarefa' }}</h3>
              <button class="btn-icon" (click)="closeTask()">×</button>
            </div>

            @if (isAdmin) {
              <label>Título</label>
              <input [(ngModel)]="editTitle" />
              <label>Descrição</label>
              <textarea [(ngModel)]="editDescription" rows="3"></textarea>
              <label>Estado</label>
              <select [(ngModel)]="editStatus">
                <option value="todo">Por fazer</option>
                <option value="doing">Em progresso</option>
                <option value="done">Concluída</option>
              </select>
              <label>Prioridade</label>
              <select [(ngModel)]="editPriority">
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
              <label>Prazo</label>
              <input type="date" [(ngModel)]="editDueDate" />
              <label>Atribuídos</label>
              <div class="assignee-checks">
                @for (m of members; track m.id) {
                  <label class="checkbox-label">
                    <input type="checkbox"
                      [checked]="editAssignees.includes(m.id)"
                      (change)="toggleAssignee(m.id, $event)" />
                    {{ m.username }}
                  </label>
                }
              </div>
   
            } @else {
              <h4>{{ selectedTask.title }}</h4>
              <p class="muted">{{ selectedTask.description || 'Sem descrição' }}</p>
              <label>Estado</label>
              <select [(ngModel)]="editStatus" (change)="saveStatusOnly()">
                <option value="todo">A fazer</option>
                <option value="doing">Em progresso</option>
                <option value="done">Concluída</option>
              </select>
            }

            @if (canTrackTime) {
              <div class="timer-section">
                <h4>Time tracking</h4>
                @if (activeOnThisTask) {
                  <p class="timer-running">⏱ {{ fmt(timer.elapsedSeconds()) }}</p>
                  <button class="btn btn-danger" (click)="stopTimer()">Parar timer</button>
                } @else {
                  <button class="btn btn-primary" (click)="startTimer()" [disabled]="!!timer.activeEntry()">
                    Iniciar timer
                  </button>
                }
                @if (timeEntries.length) {
                  <ul class="time-list">
                    @for (e of timeEntries; track e.id) {
                      <li>{{ e.user_name }} — {{ fmt(e.duration || 0) }}</li>
                    }
                  </ul>
                }
              </div>
            }

            @if (isAdmin) {
              <div class="comments-section">
                <h4>Recorrência</h4>
                <div class="inline-form">
                  <label>Tipo</label>
                  <select [(ngModel)]="recurrenceRuleType">
                    <option value="fixed_day">Dia fixo</option>
                    <option value="business_day">Dia útil</option>
                  </select>
                  <label>Frequência</label>
                  <select [(ngModel)]="recurrenceFrequency">
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                  <br>
                  <label>Intervalo</label>
                  <input type="number" min="1" [(ngModel)]="recurrenceInterval" />
                </div>
                @if (recurrenceFrequency === 'weekly') {
                  <label>Dia da semana</label>
                  <select [(ngModel)]="recurrenceWeekday">
                    <option value="monday">Segunda</option>
                    <option value="tuesday">Terça</option>
                    <option value="wednesday">Quarta</option>
                    <option value="thursday">Quinta</option>
                    <option value="friday">Sexta</option>
                    <option value="saturday">Sábado</option>
                    <option value="sunday">Domingo</option>
                  </select>
                }
                @if (recurrenceFrequency === 'monthly' || recurrenceFrequency === 'yearly') {
                  <div class="inline-form">
                    <label>Dia do mês</label>
                    <input type="number" min="1" max="31" [(ngModel)]="recurrenceDayOfMonth" />
                    @if (recurrenceFrequency === 'yearly') {
                      <label>Mês</label>
                      <input type="number" min="1" max="12" [(ngModel)]="recurrenceMonthOfYear" />
                    }
                  </div>
                }
                <div class="inline-form">
                  <label>Data início</label>
                  <input type="date" [(ngModel)]="recurrenceStartDate" />
                  <label>Data fim</label>
                  <input type="date" [(ngModel)]="recurrenceEndDate" />
                </div>
                <button class="btn btn-primary" (click)="createRecurrence()">Criar recorrência</button>
                @if (recurrenceMessage) {
                  <p class="muted">{{ recurrenceMessage }}</p>
                }
              </div>
            }

            <div class="comments-section">
              <h4>Comentários</h4>
              @for (c of selectedTask.comments || []; track c.id) {
                <div class="comment">
                  <div class="comment-header">
                    <strong>{{ c.user_name }}</strong>
                    @if (c.user_id === auth.currentUser()?.id) {
                      <a href="#" class="delete-link" (click)="deleteComment(c.id); $event.preventDefault()" title="Eliminar comentário">x</a>
                    }
                  </div>
                  <p>{{ c.content }}</p>
                </div>
              }
              <div class="inline-form">
                <input [(ngModel)]="newComment" placeholder="Adicionar comentário..." />
                <button class="btn btn-primary" (click)="postComment()">Enviar</button>
              </div>
            </div>
              <br>
               <div class="modal-actions">
                <button class="btn btn-primary" (click)="saveTask()">Guardar</button>
                @if (isAdmin) {
                  <button class="btn btn-danger" (click)="deleteTask()">Eliminar</button>
                }
              </div>
          </div>
        </div>
      }

      @if (showNewTaskForm) {
        <div class="modal-overlay" (click)="showNewTaskForm = false">
          <div class="modal card" (click)="$event.stopPropagation()">
            <h3>Nova tarefa</h3>
            <label>Título</label>
            <input [(ngModel)]="newTaskTitle" />
            <label>Descrição</label>
            <textarea [(ngModel)]="newTaskDescription" rows="2"></textarea>
            <label>Prioridade</label>
            <select [(ngModel)]="newTaskPriority">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <label>Prazo</label>
            <input type="date" [(ngModel)]="newTaskDueDate" />
            <label>Atribuídos</label>
            <div class="assignee-checks">
              @for (m of members; track m.id) {
                <label class="checkbox-label">
                  <input type="checkbox"
                    [checked]="newTaskAssignees.includes(m.id)"
                    (change)="toggleNewAssignee(m.id, $event)" />
                  {{ m.username }}
                </label>
              }
            </div>
            <button class="btn btn-primary" (click)="createTask()">Criar tarefa</button>
          </div>
        </div>
      }
    </div>
  `,
})
=======
  imports: [FormsModule, RouterLink,MatCheckboxModule],
  styleUrls: ['./project.component.css'],
  templateUrl: './project.component.html',
  })

>>>>>>> Stashed changes
export class ProjectComponent implements OnInit {
  project: Project | null = null;
  lists: TaskList[] = [];
  tasksByList: Record<number, Task[]> = {};
  members: TeamMember[] = [];
  isAdmin = false;
  showNewList = false;
<<<<<<< HEAD
  viewMode: 'board' | 'list' = 'board';
=======
<<<<<<< Updated upstream
>>>>>>> Branch_do_vaskinhoooo

=======
  viewMode: 'board' | 'list' = 'board';
  showOnlyMyTasks = false;
>>>>>>> Stashed changes
  newListName = '';
  showNewTaskForm = false;
  newTaskListId = 0;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskPriority = 'medium';
  newTaskDueDate = '';
  newTaskAssignees: number[] = [];
  selectedTask: (Task & { comments?: Comment[] }) | null = null;
  editTitle = '';
  editDescription = '';
  editStatus = 'todo';
  editPriority = 'medium';
  editDueDate = '';
  editAssignees: number[] = [];
  newComment = '';
  timeEntries: TimeEntry[] = [];
  fmt = formatDuration;
  selectedFile: File | null = null;
  selectedFileName = '';
  recurrenceRuleType = 'fixed_day';
  recurrenceFrequency = 'daily';
  recurrenceInterval = 1;
  recurrenceWeekday = 'monday';
  recurrenceDayOfMonth = 1;
  recurrenceMonthOfYear = 1;
  recurrenceStartDate = '';
  recurrenceEndDate = '';
  recurrenceMessage = '';
  listSearch = '';
  listFilterList = '';
  listFilterStatus = '';
  listFilterPriority = '';
  listFilterDueDate = '';
  listPage = 1;
  listPageSize = 10;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    public timer: TimerService,
    private http: HttpClient
  ) {
  }

  toggleTaskFilter(event: MatCheckboxChange) {
    if (this.isAdmin) {
      this.showOnlyMyTasks = event.checked;
    } else {
      this.showOnlyMyTasks = !event.checked;
    }
  }

  getTasksForList(listId: number): Task[] {
    const tasks = this.tasksByList[listId] || [];

    if (!this.showOnlyMyTasks) {
      return tasks;
    }
    const userId = this.currentUserId;
    return tasks.filter(task =>
      task.assigneeIds?.includes(userId!)
    );
  }


  get currentUserId(): number | undefined{
    return this.auth.currentUser()?.id;
  }

  get canTrackTime(): boolean {
    if (!this.selectedTask) return false;
    const uid = this.auth.currentUser()?.id;
    return !!uid && this.selectedTask.assigneeIds.includes(uid);
  }

  get activeOnThisTask(): boolean {
    const active = this.timer.activeEntry();
    return !!active && active.task_id === this.selectedTask?.id;
  }

  ngOnInit() {
    const projectId = +this.route.snapshot.paramMap.get('id')!;
    this.api.getProject(projectId).subscribe(p => {
      this.project = p;
      this.api.getTeams().subscribe(teams => {
        const t = teams.find(x => x.id === p.team_id);
        this.isAdmin = t?.role === 'admin';
      });
      this.api.getTeamMembers(p.team_id).subscribe(m => this.members = m);
      this.api.getTeams().subscribe(teams => {
        const t = teams.find(x => x.id === p.team_id);
        this.isAdmin = t?.role === 'admin';
      
        this.showOnlyMyTasks = !this.isAdmin;
      });
    });
    this.loadBoard(projectId);
    this.timer.refresh();
    
  }

  loadBoard(projectId: number) {
    this.api.getTaskLists(projectId).subscribe(lists => {
      this.lists = lists;
      for (const list of lists) {
        this.api.getTasks(list.id).subscribe(tasks => {
          this.tasksByList[list.id] = tasks;
        });
      }
    });
  }

  statusLabel(s: string) {
    return { todo: 'Por fazer', doing: 'Em progresso', done: 'Concluída' }[s] || s;
  }

<<<<<<< HEAD
=======
<<<<<<< Updated upstream
=======
>>>>>>> Branch_do_vaskinhoooo
  get listViewTasks(): Array<{ task: Task; listName: string }> {
    const rows: Array<{ task: Task; listName: string }> = [];
    for (const list of this.lists) {
      for (const task of this.tasksByList[list.id] || []) {
        rows.push({ task, listName: list.name });
      }
    }
    return rows;
  }

  get filteredListViewTasks(): Array<{ task: Task; listName: string }> {
    const search = this.listSearch.trim().toLowerCase();
    return this.listViewTasks.filter(({ task, listName }) => {
<<<<<<< HEAD
=======
      
      const userId = this.currentUserId;
      const matchesMyTasks =!this.showOnlyMyTasks ||task.assigneeIds?.includes(userId!);
>>>>>>> Branch_do_vaskinhoooo
      const matchesList = !this.listFilterList || this.listFilterList === String(task.task_list_id);
      const matchesStatus = !this.listFilterStatus || task.status === this.listFilterStatus;
      const matchesPriority = !this.listFilterPriority || task.priority === this.listFilterPriority;
      const matchesSearch = !search || task.title.toLowerCase().includes(search) || listName.toLowerCase().includes(search);

      let matchesDueDate = true;
      if (this.listFilterDueDate && task.due_date) {
        const due = new Date(task.due_date);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        if (this.listFilterDueDate === 'today') {
          matchesDueDate = due >= startOfToday && due < new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        } else if (this.listFilterDueDate === 'week') {
          matchesDueDate = due >= startOfWeek && due < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (this.listFilterDueDate === 'overdue') {
          matchesDueDate = due < startOfToday;
        }
      } else if (this.listFilterDueDate && !task.due_date) {
        matchesDueDate = false;
      }
<<<<<<< HEAD

      return matchesList && matchesStatus && matchesPriority && matchesSearch && matchesDueDate;
=======
      return matchesMyTasks && matchesList && matchesStatus && matchesPriority && matchesSearch && matchesDueDate;
>>>>>>> Branch_do_vaskinhoooo
    });
  }

  get totalListPages(): number {
    return Math.max(1, Math.ceil(this.filteredListViewTasks.length / this.listPageSize));
  }

  get pagedListViewTasks(): Array<{ task: Task; listName: string }> {
    const start = (this.listPage - 1) * this.listPageSize;
    return this.filteredListViewTasks.slice(start, start + this.listPageSize);
  }

<<<<<<< HEAD
=======
>>>>>>> Stashed changes
>>>>>>> Branch_do_vaskinhoooo
  formatDate(value: string | null) {
    if (!value) return 'Sem prazo';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem prazo';
    return date.toLocaleDateString('pt-PT');
  }

  createList() {
    if (!this.project || !this.newListName.trim()) return;
    this.api.createTaskList(this.project.id, this.newListName.trim()).subscribe(list => {
      this.lists = [...this.lists, list];
      this.tasksByList[list.id] = [];
      this.newListName = '';
      this.showNewList = false;
    });
  }

  openNewTask(listId: number) {
    this.newTaskListId = listId;
    this.showNewTaskForm = true;
  }

  toggleNewAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.newTaskAssignees = [...this.newTaskAssignees, id];
    else this.newTaskAssignees = this.newTaskAssignees.filter(x => x !== id);
  }

  createTask() {
    if (!this.newTaskTitle.trim()) return;
    this.api.createTask({
      taskListId: this.newTaskListId,
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      priority: this.newTaskPriority as Task['priority'],
      dueDate: this.newTaskDueDate || null,
      assigneeIds: this.newTaskAssignees,
    }).subscribe(task => {
      const listId = this.newTaskListId;
      this.tasksByList[listId] = [task, ...(this.tasksByList[listId] || [])];
      this.showNewTaskForm = false;
      this.newTaskTitle = '';
      this.newTaskDescription = '';
      this.newTaskDueDate = '';
      this.newTaskAssignees = [];
    });
  }

  openTask(taskId: number) {
    this.api.getTask(taskId).subscribe(task => {
      this.selectedTask = task;
      this.editTitle = task.title;
      this.editDescription = task.description;
      this.editStatus = task.status;
      this.editPriority = task.priority;
      this.editDueDate = task.due_date?.slice(0, 10) || '';
      this.editAssignees = [...task.assigneeIds];
      this.resetRecurrenceForm();
      this.api.getTaskTimeEntries(taskId).subscribe(e => this.timeEntries = e);
    });
  }

  closeTask() { this.selectedTask = null; }

  toggleAssignee(id: number, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.editAssignees = [...this.editAssignees, id];
    else this.editAssignees = this.editAssignees.filter(x => x !== id);
  }

  saveTask() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, {
      title: this.editTitle,
      description: this.editDescription,
      status: this.editStatus as Task['status'],
      priority: this.editPriority as Task['priority'],
      dueDate: this.editDueDate || null,
      assigneeIds: this.editAssignees,
    }).subscribe(updated => {
      this.refreshTaskInBoard(updated);
      this.selectedTask = { ...this.selectedTask!, ...updated, assigneeIds: this.editAssignees };
      this.closeTask();
    });
  }

  saveStatusOnly() {
    if (!this.selectedTask) return;
    this.api.updateTask(this.selectedTask.id, { status: this.editStatus as Task['status'] })
      .subscribe(updated => this.refreshTaskInBoard(updated));
  }

  resetRecurrenceForm() {
    this.recurrenceRuleType = 'fixed_day';
    this.recurrenceFrequency = 'daily';
    this.recurrenceInterval = 1;
    this.recurrenceWeekday = 'monday';
    this.recurrenceDayOfMonth = 1;
    this.recurrenceMonthOfYear = 1;
    this.recurrenceStartDate = this.editDueDate;
    this.recurrenceEndDate = '';
    this.recurrenceMessage = '';
  }

  createRecurrence() {
    if (!this.selectedTask) return;

    const payload: Record<string, unknown> = {
      frequency: this.recurrenceFrequency,
      interval: this.recurrenceInterval,
      start_date: this.recurrenceStartDate || this.editDueDate || null,
      end_date: this.recurrenceEndDate || null,
      rule_type: this.recurrenceRuleType,
    };

    if (this.recurrenceFrequency === 'weekly') {
      payload['weekday'] = this.recurrenceWeekday;
    }
    if (this.recurrenceFrequency === 'monthly') {
      payload['day_of_month'] = this.recurrenceDayOfMonth;
    }
    if (this.recurrenceFrequency === 'yearly') {
      payload['day_of_month'] = this.recurrenceDayOfMonth;
      payload['month_of_year'] = this.recurrenceMonthOfYear;
    }

    this.api.createRecurrence(this.selectedTask.id, payload).subscribe({
      next: () => {
        this.recurrenceMessage = 'Recorrência criada com sucesso.';
      },
      error: (err) => {
        this.recurrenceMessage = err?.error?.message || 'Não foi possível criar a recorrência.';
      }
    });
  }

  deleteTask() {
    if (!this.selectedTask || !confirm('Eliminar esta tarefa?')) return;
    const id = this.selectedTask.id;
    const listId = this.selectedTask.task_list_id;
    this.api.deleteTask(id).subscribe(() => {
      this.tasksByList[listId] = (this.tasksByList[listId] || []).filter(t => t.id !== id);
      this.closeTask();
    });
  }

  refreshTaskInBoard(task: Task) {
    const listId = task.task_list_id;
    const arr = this.tasksByList[listId] || [];
    if (task.status === 'done') {
      this.tasksByList[listId] = arr.filter(t => t.id !== task.id);
    } else {
      this.tasksByList[listId] = arr.map(t => t.id === task.id ? { ...t, ...task } : t);
    }
  }

  startTimer() {
    if (!this.selectedTask) return;
    this.timer.start(this.selectedTask.id);
  }

  stopTimer() {
    this.timer.stop();
    if (this.selectedTask) {
      this.api.getTaskTimeEntries(this.selectedTask.id).subscribe(e => this.timeEntries = e);
    }
  }

  postComment() {
    if (!this.selectedTask || !this.newComment.trim()) return;
    this.api.addComment(this.selectedTask.id, this.newComment.trim()).subscribe((c: Comment) => {
      this.selectedTask!.comments = [...(this.selectedTask!.comments || []), c];
      this.newComment = '';
    });
  }

  deleteComment(commentId: number) {
    if (!this.selectedTask || !confirm('Eliminar este comentário?')) return;
    this.api.deleteComment(this.selectedTask.id, commentId).subscribe(() => {
      this.selectedTask!.comments = (this.selectedTask!.comments || []).filter(c => c.id !== commentId);
    });
  }


  deleteList(listId: number) {
    if (confirm('Tem a certeza que quer eliminar esta lista?')) {
      this.api.deleteTaskList(listId).subscribe(() => {
        this.lists = this.lists.filter(l => l.id !== listId);
        delete this.tasksByList[listId];
      });
    }
  }

  deleteProject() {
    if (!this.project || !confirm('Tem a certeza que quer eliminar este projeto? Esta ação é irreversível.')) return;
    this.api.deleteProject(this.project.id).subscribe(() => {
      window.location.href = `/teams/${this.project!.team_id}`;
    });
  }

  onFileSelected(event: any) {
    const target: DataTransfer = <DataTransfer>event.target;
    if (!target.files || target.files.length !== 1) {
      this.selectedFile = null;
      this.selectedFileName = '';
      return;
    }
    this.selectedFile = target.files[0];
    this.selectedFileName = this.selectedFile.name;
  }

  submitExcel() {
    if (!this.selectedFile || !this.project) return;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const binaryStr: string = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        this.http.post(
          `${environment.apiUrl}/import/${this.project?.team_id}/${this.project?.id}`,
          data
        ).subscribe({
          next: () => {
            console.log(`Importação da folha "${sheetName}" concluída.`);
            this.selectedFile = null;
            this.selectedFileName = '';
            this.reloadBoard();
          },
          error: err => {
            console.error(`Erro ao importar a folha "${sheetName}"`, err);
          }
        });
      });
    };

    reader.readAsBinaryString(this.selectedFile);
  }

  reloadBoard() {
    if (!this.project) return;
    this.loadBoard(this.project.id);
  }
}
