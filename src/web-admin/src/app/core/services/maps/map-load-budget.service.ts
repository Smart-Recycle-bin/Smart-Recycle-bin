import { Injectable } from '@angular/core';

declare const ngDevMode: boolean | undefined;

export interface MapInitStats {
  session: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapLoadBudgetService {
  static readonly STORAGE_KEY = 'ecobin_map_session_inits';
  static readonly DEFAULT_LIMIT = 8;

  private limit = MapLoadBudgetService.DEFAULT_LIMIT;
  private pageInits = 0;

  constructor() {
    this.syncDevModeExposure();
  }

  /**
   * Sets the maximum allowed Map instantiations per tab session.
   */
  setLimit(newLimit: number): void {
    this.limit = Math.max(1, newLimit);
  }

  /**
   * Returns whether a new Map instantiation is permitted within current session budget.
   */
  allow(): boolean {
    return this.getSessionCount() < this.limit;
  }

  /**
   * Records a Map instantiation. Increments session and page counters.
   * Returns true if recorded within budget, false if budget was already exhausted.
   */
  recordInit(): boolean {
    if (!this.allow()) {
      return false;
    }

    const nextSession = this.getSessionCount() + 1;
    this.setSessionCount(nextSession);
    this.pageInits++;

    this.syncDevModeExposure();
    return true;
  }

  /**
   * Returns current session count from sessionStorage.
   */
  getSessionCount(): number {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return this.pageInits;
    }

    try {
      const stored = window.sessionStorage.getItem(MapLoadBudgetService.STORAGE_KEY);
      const parsed = parseInt(stored ?? '0', 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return this.pageInits;
    }
  }

  /**
   * Returns in-memory page inits count.
   */
  getPageCount(): number {
    return this.pageInits;
  }

  /**
   * Returns remaining budget before limit is reached.
   */
  getRemainingBudget(): number {
    return Math.max(0, this.limit - this.getSessionCount());
  }

  /**
   * Exposes __mapInits on window when ngDevMode is active.
   */
  private syncDevModeExposure(): void {
    const isDev = typeof ngDevMode === 'undefined' || !!ngDevMode;
    if (isDev && typeof window !== 'undefined') {
      (window as unknown as { __mapInits?: MapInitStats }).__mapInits = {
        session: this.getSessionCount(),
        page: this.pageInits,
        limit: this.limit,
      };
    }
  }

  private setSessionCount(count: number): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(
          MapLoadBudgetService.STORAGE_KEY,
          count.toString()
        );
      } catch {
        // Storage quota or permission blocked
      }
    }
  }

  /**
   * Resets budget counters for test isolation.
   */
  resetForTesting(): void {
    this.limit = MapLoadBudgetService.DEFAULT_LIMIT;
    this.pageInits = 0;
    if (typeof window !== 'undefined') {
      if (window.sessionStorage) {
        window.sessionStorage.removeItem(MapLoadBudgetService.STORAGE_KEY);
      }
      delete (window as unknown as { __mapInits?: unknown }).__mapInits;
    }
  }
}
