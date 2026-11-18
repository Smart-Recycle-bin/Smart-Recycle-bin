import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@services/auth/auth.service';
import { ToastService } from '@services/toast/toast.service';
import { UserRole } from '@models/user/user-role.enum';

/**
 * Functional role guard enforcing role-based access control.
 * Inspects route.data['roles'] using bracket access.
 * If roles metadata is missing or the authenticated user's role is not authorized,
 * the session is cleared, an "Administrators only" toast is shown, and the user is
 * redirected to /login.
 */
export const roleGuard: CanActivateFn = (route): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  const allowedRoles = route.data['roles'] as UserRole[] | undefined;
  const userRole = authService.role();

  if (
    !allowedRoles ||
    allowedRoles.length === 0 ||
    !userRole ||
    !allowedRoles.includes(userRole)
  ) {
    authService.clearSession();
    toastService.error('Administrators only');
    return router.createUrlTree(['/login']);
  }

  return true;
};
