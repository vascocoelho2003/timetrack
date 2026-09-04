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
      pending: this.api.getPendingUnassignedTimer().pipe(catchError(() => of(null))),
    }).subscribe(({ active, pending }) => {
      this.activeEntry.set(active);
      this.pendingUnassigned.set(pending);
      if (active) this.startTicking(active.start);
      else this.stopTicking();
      done?.();
    });
  }

  start(taskId?: number) {
    return this.api.startTimer(taskId).subscribe({
      next: entry => {
        this.activeEntry.set(entry);
        this.startTicking(entry.start);
      },
    });
  }

  stop() {
    return this.api.stopTimer().pipe(
      tap(entry => {
        this.activeEntry.set(null);
        this.stopTicking();
        this.elapsedSeconds.set(0);
        if (entry && !entry.task_id) {
          this.pendingUnassigned.set(entry);
        }
      })
    );
  }

  clearPendingUnassigned() {
    this.pendingUnassigned.set(null);
  }

  private startTicking(startIso: string) {
    this.stopTicking();
    const update = () => {
      this.elapsedSeconds.set(
        Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)
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
