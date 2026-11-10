import { Injectable, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { TimeEntry } from './models';

@Injectable({ providedIn: 'root' })
export class TimerService {
  activeEntry = signal<TimeEntry | null>(null);
  pendingUnassigned = signal<TimeEntry | null>(null);
  elapsedSeconds = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private api: ApiService) {}

  refresh(done?: () => void) {
    forkJoin({
      active: this.api.getActiveTimer().pipe(catchError(() => of(null))),
      pending: this.api
        .getPendingUnassignedTimer()
        .pipe(catchError(() => of(null))),
    }).subscribe(({ active, pending }) => {
      this.activeEntry.set(active);
      this.pendingUnassigned.set(pending);
      if (active) this.startTicking(active.start);
      else this.stopTicking();
      done?.();
    });
  }

  start(taskId?: number) {
    return this.api.startTimer(taskId).pipe(
      tap((entry) => {
        this.activeEntry.set(entry);
        this.startTicking(entry.start);
      }),
    );
  }

  stop() {
    return this.api.stopTimer().pipe(
      tap((entry) => {
        this.activeEntry.set(null);
        this.stopTicking();
        this.elapsedSeconds.set(0);
        if (entry && !entry.task_id) {
          this.pendingUnassigned.set(entry);
        }
      }),
    );
  }

  clearPendingUnassigned() {
    this.pendingUnassigned.set(null);
  }

  private startTicking(startIso: string) {
    this.stopTicking();
    const update = () => {
      this.elapsedSeconds.set(
        Math.floor((Date.now() - new Date(startIso).getTime()) / 1000),
      );
    };
    update();
    this.intervalId = setInterval(update, 1000);
  }

  private stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function durationToHoursMinutes(
  seconds: number | null | undefined,
): { hours: number | null; minutes: number | null } {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!value) return { hours: null, minutes: null };
  return {
    hours: Math.floor(value / 3600) || null,
    minutes: Math.floor((value % 3600) / 60) || null,
  };
}

export function hoursMinutesToSeconds(
  hours: number | string | null | undefined,
  minutes: number | string | null | undefined,
): number | null {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  if (h === 0 && m === 0) return null;
  return h * 3600 + m * 60;
}

export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatTimeRange(
  start: string,
  end: string | null | undefined,
): string {
  const fmt = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  if (!end) return fmt(start);
  return `${fmt(start)} → ${fmt(end)}`;
}
