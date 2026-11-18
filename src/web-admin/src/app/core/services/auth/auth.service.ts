import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import {
  catchError,
  finalize,
  firstValueFrom,
  from,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { TokenStorageService } from './token-storage.service';
import {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  RefreshTokenResponse,
  StoredSession,
} from '@models/auth/auth.dto';
import { UserRole } from '@models/user/user-role.enum';
import { SKIP_AUTH, SKIP_ERROR_HANDLING } from '@core/interceptors/shared/http-context-tokens';
import { AuthError } from '@core/errors/auth-error';

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private readonly apiClient = inject(ApiClientService);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _session = signal<StoredSession | null>(null);

  /**
   * Reactive signal advanced when a session reaches its expiresAt deadline.
   */
  readonly now = signal<number>(Date.now());
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Reactive signals for current authentication state.
   */
  readonly session = this._session.asReadonly();

  readonly isAuthenticated = computed<boolean>(() => {
    const s = this._session();
    if (!s || !s.accessToken || !s.expiresAt) {
      return false;
    }
    return new Date(s.expiresAt).getTime() > this.now();
  });

  readonly hasRefreshToken = computed<boolean>(() => {
    const s = this._session();
    return Boolean(s && s.refreshToken);
  });

  readonly role = computed<UserRole | null>(() => this._session()?.user?.role ?? null);

  readonly accessToken = computed<string | null>(() => this._session()?.accessToken ?? null);

  private refreshInFlight$: Observable<void> | null = null;

  constructor() {
    this.restoreSession();

    // Listen to changes across browser tabs
    this.tokenStorage.storageChanges$.subscribe((syncedSession) => {
      this.setSession(syncedSession);
    });
  }

  ngOnDestroy(): void {
    this.clearExpiryTimer();
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer !== null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private scheduleExpiryTimer(session: StoredSession | null): void {
    this.clearExpiryTimer();
    if (!session || !session.expiresAt) {
      return;
    }

    const expiryTime = new Date(session.expiresAt).getTime();
    const delay = Math.max(0, expiryTime - Date.now());

    this.expiryTimer = setTimeout(() => {
      this.now.set(Date.now());
      this.expiryTimer = null;
    }, delay);
  }

  private setSession(stored: StoredSession | null): void {
    this._session.set(stored);
    this.scheduleExpiryTimer(stored);
    this.now.set(Date.now());
  }

  /**
   * Restores stored session from persistent storage on startup.
   */
  restoreSession(): void {
    const stored = this.tokenStorage.getSession();
    this.setSession(stored);
  }

  /**
   * Authenticates administrator.
   * If the authenticated role is not SYS_ADMIN, best-effort revokes the refresh token and throws AuthError.
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const context = new HttpContext().set(SKIP_AUTH, true);

    return this.apiClient
      .post<LoginResponse>(API_ENDPOINTS.auth.login, credentials, { context })
      .pipe(
        switchMap((response) => {
          if (response.user.role !== UserRole.Admin) {
            const revoke$ = response.refreshToken
              ? this.apiClient
                  .post<void>(
                    API_ENDPOINTS.auth.logout,
                    { refreshToken: response.refreshToken },
                    { context }
                  )
                  .pipe(catchError(() => of(undefined)))
              : of(undefined);

            return revoke$.pipe(
              switchMap(() => {
                this.clearSession();
                return throwError(
                  () =>
                    new AuthError(
                      'NOT_ADMIN',
                      'Access denied: Only system administrators can access this portal'
                    )
                );
              })
            );
          }

          const expiresAt = new Date(Date.now() + response.expiresIn * 1000).toISOString();
          const storedSession: StoredSession = {
            accessToken: response.accessToken,
            expiresAt,
            refreshToken: response.refreshToken ?? null,
            user: response.user,
          };

          this.tokenStorage.saveSession(storedSession);
          this.setSession(storedSession);

          return of(response);
        })
      );
  }

  /**
   * Triggers password reset email request.
   */
  forgotPassword(payload: ForgotPasswordRequest): Observable<void> {
    const context = new HttpContext().set(SKIP_AUTH, true);
    return this.apiClient.post<void>(API_ENDPOINTS.auth.forgotPassword, payload, { context });
  }

  /**
   * Best-effort logout calling the backend to revoke refresh token,
   * always clearing session state locally regardless of network success or error.
   */
  logout(): Observable<void> {
    const refreshToken = this._session()?.refreshToken ?? undefined;
    const body: LogoutRequest = { refreshToken };
    const context = new HttpContext().set(SKIP_AUTH, true);

    return this.apiClient
      .post<void>(API_ENDPOINTS.auth.logout, body, { context })
      .pipe(
        catchError(() => of(undefined)),
        finalize(() => {
          this.clearSession();
        })
      );
  }

  /**
   * Clears session locally and wipes persistent storage.
   */
  clearSession(): void {
    this.tokenStorage.clearSession();
    this.clearExpiryTimer();
    this._session.set(null);
    this.now.set(Date.now());
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Single-flight with reset on the source side to ensure subscriber unsubscription
   * never resets or duplicates the in-flight request.
   */
  refresh(): Observable<void> {
    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    const initialSession = this.tokenStorage.getSession();
    const tokenToRefresh = initialSession?.refreshToken;

    if (!tokenToRefresh) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    const runWithLock = (): Observable<void> => {
      if (
        typeof navigator !== 'undefined' &&
        'locks' in navigator &&
        navigator.locks &&
        typeof navigator.locks.request === 'function'
      ) {
        return from(
          navigator.locks.request('ecobin-auth-refresh', async () => {
            // Re-read storage: another tab may have finished refreshing while waiting for the lock
            const latestSession = this.tokenStorage.getSession();
            if (
              latestSession &&
              latestSession.refreshToken &&
              latestSession.refreshToken !== tokenToRefresh
            ) {
              this.setSession(latestSession);
              return;
            }

            await firstValueFrom(this.executeRefreshRequest(tokenToRefresh));
          })
        );
      }

      return this.executeRefreshRequest(tokenToRefresh);
    };

    // finalize sits on the source stream before shareReplay so downstream unsubscription does not cancel/reset
    this.refreshInFlight$ = runWithLock().pipe(
      finalize(() => {
        this.refreshInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.refreshInFlight$;
  }

  /**
   * Executes the raw refresh HTTP request.
   */
  private executeRefreshRequest(tokenToRefresh: string): Observable<void> {
    const context = new HttpContext().set(SKIP_AUTH, true).set(SKIP_ERROR_HANDLING, true);

    return this.apiClient
      .post<RefreshTokenResponse>(
        API_ENDPOINTS.auth.refresh,
        { refreshToken: tokenToRefresh },
        { context }
      )
      .pipe(
        map((response) => {
          const current = this.tokenStorage.getSession() ?? this._session();
          if (!current) {
            throw new Error('Session was cleared during refresh');
          }

          const expiresAt = new Date(Date.now() + response.expiresIn * 1000).toISOString();
          const updatedSession: StoredSession = {
            accessToken: response.accessToken,
            expiresAt,
            refreshToken: response.refreshToken,
            user: current.user,
          };

          this.tokenStorage.saveSession(updatedSession);
          this.setSession(updatedSession);
        }),
        catchError((err: unknown) => {
          // Invalidate session on authorization or token rejection errors
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401 || err.status === 403) {
              this.clearSession();
            }
          } else if (
            err &&
            typeof err === 'object' &&
            'status' in err &&
            (err.status === 401 || err.status === 403)
          ) {
            this.clearSession();
          }
          return throwError(() => err);
        })
      );
  }
}
