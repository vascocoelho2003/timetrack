import { Component } from '@angular/core';
import { Task } from '../../core/models';
import { Location } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-closed-tasks',
  imports: [RouterLink],
  templateUrl: './closed-tasks.component.html',
  styleUrl: './closed-tasks.component.css'
})
export class ClosedTasksComponent {
  closed_tasks: Task[] = [];
  projectId: number = 0;
  selectedTask: (Task & { comments?: Comment[] }) | null = null;
  constructor(private location: Location, private apiService: ApiService,private route: ActivatedRoute) {
  }


  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id'));
      this.loadClosedTasks();
    });
  }

  closeTask(){
    this.selectedTask = null;
  }

  goBack() {
    this.location.back();
  }

  statusLabel(s: string) {
    return { todo: 'Por fazer', doing: 'Em progresso', done: 'Concluída' }[s] || s;
  }

  loadClosedTasks() {
    this.apiService.getClosedTasks(this.projectId).subscribe(tasks => {
      this.closed_tasks = tasks;
    });
  }
}
