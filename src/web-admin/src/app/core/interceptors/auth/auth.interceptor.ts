import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../services/auth/auth.service';
import { API_ENDPOINTS } from '../../services/api/api-endpoints';
import { RETRIED, SKIP_AUTH } from '../shared/http-context-tokens';

/**
 * Checks whether a request targets the backend API base URL.
 */
function isApiUrl(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl) || url.startsWith('/api/v1');
}

/**
 * Checks whether the endpoint is public and does not require an Authorization header.
 */
function isPublicAuthEndpoint(url: string): boolean {
  return (
    url.includes(API_ENDPOINTS.auth.login) ||
    url.includes(API_ENDPOINTS.auth.refresh) ||
    url.includes(API_ENDPOINTS.auth.forgotPassword)
  );
}

/**
 * Checks whether the endpoint is an auth lifecycle endpoint (login, refresh, logout)
 * which should not trigger an automatic 401 refresh-retry cycle.
 */
function isAuthLifecycleEndpoint(url: string): boolean {
  return isPublicAuthEndpoint(url) || url.includes(API_ENDPOINTS.auth.logout);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const shouldAttachToken =
    isApiUrl(req.url) &&
    !isPublicAuthEndpoint(req.url) &&
    !req.context.get(SKIP_AUTH) &&
    authService.isAuthenticated() &&
    Boolean(authService.accessToken());

  let outgoingReq: HttpRequest<unknown> = req;
  if (shouldAttachToken) {
    outgoingReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authService.accessToken()}`,
      },
    });
  }

  return next(outgoingReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiUrl(req.url) &&
        !isAuthLifecycleEndpoint(req.url) &&
        !req.context.get(RETRIED) &&
        !req.context.get(SKIP_AUTH) &&
        authService.hasRefreshToken()
      ) {
        // Trigger single-flight refresh directly from AuthService and retry original request once
        return authService.refresh().pipe(
          switchMap(() => {
            const newAccessToken = authService.accessToken();
            const retriedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`,
              },
              context: req.context.set(RETRIED, true),
            });
            return next(retriedReq);
          }),
          catchError(() => {
            // Rethrow original 401 unchanged if refresh fails
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
