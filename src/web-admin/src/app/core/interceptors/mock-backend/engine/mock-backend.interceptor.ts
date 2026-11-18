import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { timer, switchMap, throwError, of } from 'rxjs';
import { environment } from '@env/environment';
import { MockRouter } from './mock-router';
import { registerAllMockHandlers } from '../handlers';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { isApiUrl } from '@core/interceptors/shared';

let mockRouterInstance: MockRouter | null = null;

export function getSharedMockRouter(): MockRouter {
  if (!mockRouterInstance) {
    mockRouterInstance = new MockRouter();
    registerAllMockHandlers(mockRouterInstance);
  }
  return mockRouterInstance;
}

export function resetSharedMockRouter(): void {
  mockRouterInstance = null;
}

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  // Only intercept API calls intended for the mock backend
  if (!isApiUrl(req.url)) {
    return next(req);
  }

  if (environment.e2e && typeof window !== 'undefined') {
    (window as unknown as { __mockCalls?: number }).__mockCalls =
      ((window as unknown as { __mockCalls?: number }).__mockCalls ?? 0) + 1;
  }

  const router = getSharedMockRouter();
  const routeExec$ = router.execute(req);

  const latencyMs = environment.mockLatencyMs ?? 0;

  return timer(latencyMs).pipe(
    switchMap(() => {
      if (!routeExec$) {
        const notFoundError = new HttpErrorResponse({
          status: 404,
          statusText: 'Not Found',
          url: req.url,
          error: {
            success: false,
            error: {
              code: ApiErrorCode.NotFound,
              message: `Mock endpoint not found: ${req.method} ${req.url}`,
            },
          },
        });
        return throwError(() => notFoundError);
      }

      return routeExec$.pipe(
        switchMap((res) => {
          if (res instanceof HttpErrorResponse) {
            return throwError(() => res);
          }
          if (res instanceof HttpResponse) {
            return of(res);
          }
          return of(
            new HttpResponse({
              status: 200,
              body: res,
            })
          );
        })
      );
    })
  );
};
