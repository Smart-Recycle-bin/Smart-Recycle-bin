import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { defer, retry, timer, throwError } from 'rxjs';

/**
 * Retries idempotent HTTP GET requests once on transient network errors (status 0) or 502/503/504 server errors.
 * Never retries mutating HTTP methods (POST, PUT, PATCH, DELETE).
 * Employs a 300 ms base delay with randomized jitter backoff.
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  return defer(() => next(req)).pipe(
    retry({
      count: 1,
      delay: (error: unknown, retryCount: number) => {
        const status =
          error instanceof HttpErrorResponse
            ? error.status
            : (error as { status?: number })?.status;

        const isRetryable =
          status === 0 ||
          status === 502 ||
          status === 503 ||
          status === 504;

        if (isRetryable && retryCount <= 1) {
          const jitter = Math.floor(Math.random() * 100);
          return timer(300 + jitter);
        }

        return throwError(() => error);
      },
    })
  );
};
