import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { TimerService, formatDuration } from '../../core/timer.service';
import { Project, TaskList, Task, TeamMember, TimeEntry, Comment } from '../../core/models';

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page project-page">
      <a [routerLink]="['/teams', project?.team_id]" class="back-link">← Equipa</a>
      <div class="page-header">
        <h2>{{ project?.name }}</h2>
        @if (isAdmin) {
          <button class="btn btn-ghost" (click)="showNewList = !showNewList">+ Lista</button>
          <button class="btn btn-ghost" [routerLink]="['/projects', project?.id, 'closed-tasks']">Closed Tasks</button>
          <button class="btn btn-danger btn-sm" (click)="deleteProject()" title="Eliminar projeto">Eliminar projeto</button>
        }
      </div>

      @if (showNewList && isAdmin) {
        <div class="card inline-form">
          <input [(ngModel)]="newListName" placeholder="Nome da lista" />
          <button class="btn btn-primary" (click)="createList()">Criar</button>
        </div>
      }

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
                <div class="status-pill">{{ task.due_date }}</div>
                  <span class="status-pill" [attr.data-status]="task.status">{{ statusLabel(task.status) }}</span>
                  <span class="priority-pill" [attr.data-priority]="task.priority">{{ task.priority }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

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
export class ProjectComponent implements OnInit {
  project: Project | null = null;
  lists: TaskList[] = [];
  tasksByList: Record<number, Task[]> = {};
  members: TeamMember[] = [];
  isAdmin = false;
  showNewList = false;

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

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public auth: AuthService,
    public timer: TimerService,
  ) {
    
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
}
