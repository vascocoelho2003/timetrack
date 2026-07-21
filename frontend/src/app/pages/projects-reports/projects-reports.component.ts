import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { userProjectsDetails } from '../../core/models';

@Component({
  selector: 'app-projects-reports',
  imports: [RouterLink],
  templateUrl: './projects-reports.component.html',
  styleUrl: './projects-reports.component.css'
})
export class ProjectsReportsComponent implements OnInit{
  projects : userProjectsDetails [] = [];

  constructor(
    private auth: AuthService,
    private apiService: ApiService,
    private router: Router
  ){

  }

  ngOnInit(): void {
    this.apiService.getUserProjectDetails().subscribe({
      next: (data)=>{
        this.projects = data;
      }
    })
    
  }

}
