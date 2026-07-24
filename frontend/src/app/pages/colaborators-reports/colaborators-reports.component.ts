import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { colaboratorReport } from '../../core/models';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-colaborators-reports',
  imports: [RouterLink, FormsModule],
  templateUrl: './colaborators-reports.component.html',
  styleUrl: './colaborators-reports.component.css'
})
export class ColaboratorsReportsComponent implements OnInit{

  linhas : colaboratorReport [] = [];
  filteredLinhas: colaboratorReport [] = [];
  searchText = '';
  page = 1;
  pageSize = 10;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ){}


  ngOnInit(): void {
    this.apiService.getColaboratorReport().subscribe({
      next: (data) => {
        this.linhas = data;
        this.filteredLinhas = data;
        this.page = 1;
      }
    })
  }

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();

    this.filteredLinhas = this.linhas.filter(linha =>
      linha.username.toLowerCase().includes(search)
    );
    this.page = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLinhas.length / this.pageSize));
  }

  get pagedLinhas(): colaboratorReport[] {
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    return this.filteredLinhas.slice(start, start + this.pageSize);
  }

  openReport(linha: colaboratorReport): void {
    this.router.navigate(['/colaborator-report', linha.user_id], {
      queryParams: {
        total_time: linha.total_time,
        username: linha.username
      }
    });
  }

  
  formatDuration(seconds:number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}
