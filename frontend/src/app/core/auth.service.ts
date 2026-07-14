import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { User } from './models';
import {environment} from '../../environments/environments';

const API = environment.apiUrl;
const TOKEN_KEY = 'timetrack_token';
const USER_KEY = 'timetrack_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadUser());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  register(email: string, password: string, username: string) {
    return this.http.post<{ user: User; token: string }>(`${API}/auth/register`, {
      email, password, username,
    }).pipe(tap(res => this.setSession(res)));
  }

  login(email: string, password: string) {
    return this.http.post<{ user: User; token: string }>(`${API}/auth/login`, {
      email, password,
    }).pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private setSession(res: { user: User; token: string }) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
