import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AppTitleStrategy } from './core/routing/title-strategy';
import { AuthService } from './core/services/auth/auth.service';
import {
  authInterceptor,
  errorInterceptor,
  retryInterceptor,
  timeoutInterceptor,
} from './core/interceptors';
import { mockBackendInterceptor } from './core/interceptors/mock-backend/engine/mock-backend.interceptor';
import { provideAppErrorHandling } from './core/errors/global-error-handler';
import { environment } from '@env/environment';

declare const ngDevMode: boolean | undefined;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppErrorHandling(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(
      withFetch(),
      withInterceptors([
        // Interceptor chain ordering rationale:
        // 1. errorInterceptor: Outermost handler; catches, normalizes (ApiError), and toasts all errors bubbling up
        //    from downstream interceptors (including timeouts, post-retry failures, 401 expirations).
        // 2. authInterceptor: Injects Authorization Bearer token header and transparently handles 401 token refresh.
        // 3. retryInterceptor: Automatically retries idempotent GET requests once upon transient network failures or 502/503/504 errors.
        // 4. timeoutInterceptor: Enforces per-request timeout limit (30s default, 120s uploads) on each HTTP attempt.
        // 5. mockBackendInterceptor: Innermost mock backend in development mode that intercepts synthetic API calls before the real network.
        errorInterceptor,
        authInterceptor,
        retryInterceptor,
        timeoutInterceptor,
        ...((typeof ngDevMode === 'undefined' || ngDevMode) && environment.useMockBackend
          ? [mockBackendInterceptor]
          : []),
      ])
    ),
    provideAppInitializer(() => {
      inject(AuthService).restoreSession();
    }),
  ],
};
