import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { AuthService } from '@services/auth/auth.service';

/**
 * Creates a UrlTree redirecting to the login page.
 * Avoids attaching returnUrl when navigating to root (/) or already to /login.
 */
function createLoginRedirect(router: Router, url: string): UrlTree {
  if (url === '/' || url.startsWith('/login')) {
    return router.createUrlTree(['/login']);
  }
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: url },
  });
}

/**
 * Functional route guard requiring an authenticated session.
 * If the current access token is expired but a refresh token exists,
 * it triggers a single-flight background refresh before allowing navigation.
 */
export const authGuard: CanActivateFn = (
  _route,
  state
): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Valid, non-expired access token present
  if (authService.isAuthenticated()) {
    return true;
  }

  // 2. Access token expired but a refresh token exists
  if (authService.hasRefreshToken()) {
    return authService.refresh().pipe(
      map(() => true),
      catchError(() => {
        // If refresh failed (401/403 or network error), redirect to login.
        // AuthService already handles clearing session only on 401/403 while keeping session on status 0.
        return of(createLoginRedirect(router, state.url));
      })
    );
  }

  // 3. No session or refresh token present
  return createLoginRedirect(router, state.url);
};
