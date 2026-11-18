import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';

/**
 * Functional route guard for guest-only pages (e.g. /login).
 * If the user already has a valid authenticated session, redirects to
 * the default admin landing route (/overview); otherwise allows access.
 * Uses isAuthenticated() only.
 */
export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Default admin landing route from app.routes.ts
    return router.createUrlTree(['/overview']);
  }

  return true;
};
