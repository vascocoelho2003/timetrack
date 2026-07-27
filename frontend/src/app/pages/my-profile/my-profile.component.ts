import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit {
  username = '';
  email = '';
  newPassword = '';
  confirmationPassword = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmationPassword = false;
  loading = false;
  error = '';
  success = '';

  constructor(private auth: AuthService) {}

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.username = user.username;
      this.email = user.email;
    }
  }

  submit() {
    this.error = '';
    this.success = '';

    if (this.newPassword !== this.confirmationPassword) {
      this.error = 'As passwords novas não coincidem.';
      return;
    }

    this.loading = true;
    this.auth.updateProfile(
      this.username.trim(),
      this.email.trim(),
      this.newPassword || undefined
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.username = res.user.username;
        this.email = res.user.email;
        this.newPassword = '';
        this.confirmationPassword = '';
        this.showNewPassword = false;
        this.showConfirmationPassword = false;
        this.success = 'Perfil atualizado com sucesso.';
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Não foi possível atualizar o perfil.';
      },
    });
  }
}
