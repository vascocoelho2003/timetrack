import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-projects',
  imports: [RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})

export class ProjectsComponent implements OnInit{
  projects : Project [] = [];
  username = '';

  constructor(
    private auth: AuthService,
    private apiService: ApiService,
    private router: Router
  ){
  }
  
  ngOnInit(): void {
    this.apiService.getUserProjects().subscribe({
      next: (data)=>{
        this.projects = data
      }
    })
  }
}
