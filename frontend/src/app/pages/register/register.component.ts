import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.error = '';
  
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
  
    if (!usernameRegex.test(this.username)) {
      this.error = 'O username não pode conter espaços nem caracteres especiais.';
      return;
    }
  
    this.loading = true;
  
    this.auth.register(this.email, this.password, this.username).subscribe({
      next: () => this.router.navigate(['/teams']),
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Erro ao registar';
      },
    });
  }
}