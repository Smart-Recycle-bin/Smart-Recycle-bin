import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '@core/errors/api-error';
import { AuthService } from '@services/auth/auth.service';
import { ToastService } from '@services/toast/toast.service';
import { API_ENDPOINTS } from '@services/api/api-endpoints';
import { SKIP_ERROR_HANDLING } from '../shared/http-context-tokens';
import { ApiErrorCode } from '@models/common/api-error-code.enum';

// In-memory timestamp cache to deduplicate identical toasts within 1500ms
const lastToastTimes = new Map<string, number>();

function showDedupedToast(
  toastService: ToastService,
  type: 'error' | 'warning' | 'info' | 'success',
  message: string
): void {
  const now = Date.now();
  const lastTime = lastToastTimes.get(message) ?? 0;
  if (now - lastTime > 1500) {
    lastToastTimes.set(message, now);
    if (type === 'error') {
      toastService.error(message);
    } else if (type === 'warning') {
      toastService.warning(message);
    } else if (type === 'info') {
      toastService.info(message);
    } else {
      toastService.success(message);
    }
  }
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((rawError: unknown) => {
      if (!(rawError instanceof HttpErrorResponse)) {
        return throwError(() => rawError);
      }

      const apiError = ApiError.fromHttpError(rawError, req.url);
      const skipHandling = req.context.get(SKIP_ERROR_HANDLING);

      if (skipHandling) {
        return throwError(() => apiError);
      }

      const isLoginRequest = req.url.includes(API_ENDPOINTS.auth.login);
      const isLogoutRequest = req.url.includes(API_ENDPOINTS.auth.logout);

      // 1. HTTP 401 Unauthorized
      if (rawError.status === 401) {
        if (isLoginRequest || isLogoutRequest) {
          // Login form handles its own invalid credentials; logout must never loop
          return throwError(() => apiError);
        }

        authService.clearSession();

        const currentUrl = router.url;
        if (!currentUrl.startsWith('/login')) {
          router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl },
          });
          showDedupedToast(toastService, 'error', 'Session expired. Please sign in again.');
        }

        return throwError(() => apiError);
      }

      // 2. HTTP 403 Forbidden
      if (rawError.status === 403) {
        if (isLoginRequest && apiError.code === ApiErrorCode.AccountSuspended) {
          // Login form shows suspended notice inline
          return throwError(() => apiError);
        }

        showDedupedToast(
          toastService,
          'error',
          "You don't have permission to perform this action."
        );
        return throwError(() => apiError);
      }

      // 3. Status 0 (Network Error)
      if (rawError.status === 0) {
        showDedupedToast(
          toastService,
          'error',
          'Network error. Please check your internet connection.'
        );
        return throwError(() => apiError);
      }

      // 4. Status 5xx (Internal Server Errors)
      if (rawError.status >= 500) {
        showDedupedToast(
          toastService,
          'error',
          'A server error occurred. Please try again later.'
        );
        return throwError(() => apiError);
      }

      // 5. Remaining 4xx domain errors are propagated to callers/forms
      return throwError(() => apiError);
    })
  );
};
