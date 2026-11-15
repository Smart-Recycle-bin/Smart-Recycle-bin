import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth/auth.service';
import { authInterceptor, errorInterceptor } from './core/interceptors';
import { mockBackendInterceptor } from './core/interceptors/mock-backend/engine/mock-backend.interceptor';
import { environment } from '../environments/environment';

declare const ngDevMode: boolean | undefined;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        errorInterceptor,
        authInterceptor,
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
