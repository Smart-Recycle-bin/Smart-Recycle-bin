import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { BinMapQuery, BinMapResponse } from '@models/bin/bin-map.model';

export type BinLiveFeedStatus = 'live' | 'stale' | 'paused' | 'error';

/**
 * Contract for smart bins live data feeds (polling, WebSocket, or SignalR).
 */
export interface BinLiveFeed {
  readonly updates$: Observable<BinMapResponse>;
  readonly status: Signal<BinLiveFeedStatus>;
  readonly lastUpdatedAt: Signal<Date | null>;

  start(queryFn?: () => BinMapQuery | undefined): void;
  stop(): void;
  refreshNow(): void;
}

export const BIN_LIVE_FEED = new InjectionToken<BinLiveFeed>('BIN_LIVE_FEED');
