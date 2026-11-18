import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '@env/environment';
import { StoredSession } from '@models/auth/auth.dto';

export interface TokenStorage {
  getSession(): StoredSession | null;
  saveSession(session: StoredSession): void;
  clearSession(): void;
  readonly storageChanges$: Observable<StoredSession | null>;
}

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService implements TokenStorage, OnDestroy {
  private readonly storageKey = environment.sessionStorageKey;
  private readonly storageChangesSubject = new Subject<StoredSession | null>();
  private readonly storageListener?: (event: StorageEvent) => void;

  readonly storageChanges$: Observable<StoredSession | null> =
    this.storageChangesSubject.asObservable();

  constructor() {
    if (typeof window !== 'undefined') {
      this.storageListener = (event: StorageEvent) => {
        if (event.key === this.storageKey) {
          const session = this.getSession();
          this.storageChangesSubject.next(session);
        }
      };
      window.addEventListener('storage', this.storageListener);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    this.storageChangesSubject.complete();
  }

  /**
   * Retrieves the stored session from localStorage in an SSR-safe, fault-tolerant manner.
   */
  getSession(): StoredSession | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
        if (!raw) {
          return null;
        }
        const parsed = JSON.parse(raw) as StoredSession;
        if (parsed && parsed.accessToken && parsed.user) {
          return parsed;
        }
      }
    } catch {
      // localStorage may be restricted or corrupt
    }
    return null;
  }

  /**
   * Persists the given session to localStorage.
   */
  saveSession(session: StoredSession): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.storageChangesSubject.next(session);
      }
    } catch {
      // localStorage write error (e.g. quota exceeded or private mode)
    }
  }

  /**
   * Clears the stored session from localStorage.
   */
  clearSession(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storageKey);
        this.storageChangesSubject.next(null);
      }
    } catch {
      // localStorage restricted
    }
  }
}
