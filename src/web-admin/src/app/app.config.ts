import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { AuthService } from './core/services/auth/auth.service';
import { authInterceptor, errorInterceptor, mockBackendInterceptor } from './core/interceptors';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        errorInterceptor,
        authInterceptor,
        ...(environment.useMockBackend ? [mockBackendInterceptor] : []),
      ])
    ),
    provideAppInitializer(() => {
      inject(AuthService).restoreSession();
    }),
  ],
};
