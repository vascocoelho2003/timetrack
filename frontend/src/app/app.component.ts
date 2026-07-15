import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/auth.service';
import { TimerService, formatDuration } from './core/timer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html' 
})
export class AppComponent implements OnInit {

  fmt = formatDuration;

  menuOpen = false;
  showBurger = false;

  @HostListener('window:resize')
  checkMenu() {
    this.showBurger = window.innerWidth < 980; // ou calcular dinamicamente
  }

ngAfterViewInit() {
  this.checkMenu();
}

  constructor(
    public auth: AuthService,
    public timer: TimerService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn) {
      this.timer.refresh();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  isActive(path: string): boolean {
    return this.router.url.startsWith(path);
  }

}