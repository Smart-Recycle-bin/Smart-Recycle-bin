import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { EMPTY, Observable, Subject, Subscription } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { BinLiveFeed, BinLiveFeedStatus } from './bin-live-feed.interface';
import { BinMapQuery, BinMapResponse } from '@models/bin/bin-map.model';
import { BinsService } from './bins.service';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class PollingBinLiveFeed implements BinLiveFeed, OnDestroy {
  private readonly binsService = inject(BinsService);
  private readonly appConfigService = inject(AppConfigService);

  private readonly _status = signal<BinLiveFeedStatus>('paused');
  readonly status = this._status.asReadonly();

  private readonly _lastUpdatedAt = signal<Date | null>(null);
  readonly lastUpdatedAt = this._lastUpdatedAt.asReadonly();

  private readonly updatesSubject = new Subject<BinMapResponse>();
  readonly updates$: Observable<BinMapResponse> = this.updatesSubject.asObservable();

  private readonly trigger$ = new Subject<BinMapQuery | undefined>();
  private triggerSub: Subscription | null = null;

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private queryFn: (() => BinMapQuery | undefined) | null = null;

  private consecutiveFailures = 0;
  private lastManualRefreshTimestamp = 0;
  private visibilityHandler: (() => void) | null = null;

  static readonly MIN_MANUAL_REFRESH_INTERVAL_MS = 5000;
  static readonly MAX_BACKOFF_MS = 300000; // 5 minutes
  static readonly INITIAL_BACKOFF_MS = 5000;

  constructor() {
    this.setupTriggerPipeline();
    this.setupVisibilityListener();
  }

  private setupTriggerPipeline(): void {
    this.triggerSub = this.trigger$
      .pipe(
        switchMap((query) =>
          this.binsService.getMapBins(query).pipe(
            catchError(() => {
              this.handleError();
              return EMPTY;
            })
          )
        )
      )
      .subscribe({
        next: (response) => {
          this.handleSuccess(response);
        },
      });
  }

  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (!this.isRunning) return;

        if (document.hidden) {
          this.clearTimer();
          this._status.set('paused');
        } else {
          // Tab became visible again
          const intervalMs = this.getBaseIntervalMs();
          const lastTime = this._lastUpdatedAt()?.getTime() ?? 0;
          const isStale = Date.now() - lastTime >= intervalMs;

          if (isStale) {
            this.executePoll();
          } else {
            // Resume schedule for remaining time
            const remaining = Math.max(100, intervalMs - (Date.now() - lastTime));
            this.scheduleNext(remaining);
            if (this.consecutiveFailures === 0) {
              this._status.set('live');
            }
          }
        }
      };

      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  start(queryFn?: () => BinMapQuery | undefined): void {
    this.stop();
    this.isRunning = true;
    this.queryFn = queryFn ?? null;
    this.consecutiveFailures = 0;
    this.lastManualRefreshTimestamp = Date.now();

    if (typeof document !== 'undefined' && document.hidden) {
      this._status.set('paused');
    } else {
      this.executePoll();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.clearTimer();
    this._status.set('paused');
  }

  refreshNow(): void {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastManualRefreshTimestamp < PollingBinLiveFeed.MIN_MANUAL_REFRESH_INTERVAL_MS) {
      return; // Throttled to min 5s
    }

    this.lastManualRefreshTimestamp = now;
    this.clearTimer();
    this.executePoll();
  }

  private executePoll(): void {
    if (!this.isRunning) return;
    const query = this.queryFn ? this.queryFn() : undefined;
    this.trigger$.next(query);
  }

  private handleSuccess(response: BinMapResponse): void {
    this.consecutiveFailures = 0;
    this._lastUpdatedAt.set(new Date());
    this._status.set('live');
    this.updatesSubject.next(response);

    if (this.isRunning && (!document || !document.hidden)) {
      this.scheduleNext(this.computeJitteredIntervalMs());
    }
  }

  private handleError(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= 3) {
      this._status.set('stale');
    } else if (!this._lastUpdatedAt()) {
      this._status.set('error');
    }

    if (this.isRunning && (!document || !document.hidden)) {
      const backoffMs = Math.min(
        PollingBinLiveFeed.MAX_BACKOFF_MS,
        PollingBinLiveFeed.INITIAL_BACKOFF_MS * Math.pow(2, this.consecutiveFailures - 1)
      );
      this.scheduleNext(backoffMs);
    }
  }

  private scheduleNext(delayMs: number): void {
    this.clearTimer();
    this.pollTimer = setTimeout(() => {
      this.executePoll();
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private getBaseIntervalMs(): number {
    const config = this.appConfigService.getConfig();
    const seconds = config?.map.refreshSeconds ?? 30;
    return Math.max(5, seconds) * 1000;
  }

  private computeJitteredIntervalMs(): number {
    const base = this.getBaseIntervalMs();
    // Jitter +/- 10%
    const jitterFactor = 0.9 + Math.random() * 0.2;
    return Math.round(base * jitterFactor);
  }

  ngOnDestroy(): void {
    this.stop();
    if (this.triggerSub) {
      this.triggerSub.unsubscribe();
      this.triggerSub = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.updatesSubject.complete();
  }
}
