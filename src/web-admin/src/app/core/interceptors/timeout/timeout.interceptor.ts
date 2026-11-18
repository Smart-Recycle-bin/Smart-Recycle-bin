import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TimeoutError, catchError, throwError, timeout } from 'rxjs';
import { ApiError } from '@core/errors/api-error';
import { ToastService } from '@services/toast/toast.service';
import { REQUEST_TIMEOUT, SKIP_ERROR_HANDLING } from '../shared/http-context-tokens';

/**
 * Enforces per-request timeouts (30s default, or 120s for uploads via REQUEST_TIMEOUT token).
 * Maps TimeoutError into an ApiError with status 408 and code 'TIMEOUT', accompanied by a user toast.
 */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const timeoutMs = req.context.get(REQUEST_TIMEOUT);

  return next(req).pipe(
    timeout(timeoutMs),
    catchError((err: unknown) => {
      if (err instanceof TimeoutError || (err as { name?: string })?.name === 'TimeoutError') {
        const skipHandling = req.context.get(SKIP_ERROR_HANDLING);
        if (!skipHandling) {
          toastService.error('Request timed out');
        }

        const apiError = new ApiError({
          status: 408,
          code: 'TIMEOUT',
          message: 'Request timed out',
          requestUrl: req.url,
        });

        return throwError(() => apiError);
      }
      return throwError(() => err);
    })
  );
};
