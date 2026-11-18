import {
  EnvironmentProviders,
  ErrorHandler,
  inject,
  Injectable,
  makeEnvironmentProviders,
} from '@angular/core';
import { LoggerService, ERROR_REPORTER, ErrorReporter } from './logger.service';
import { ToastService } from '@services/toast/toast.service';

export const CHUNK_RELOAD_SESSION_KEY = 'chunk_reload_attempted';

@Injectable({
  providedIn: 'root',
})
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);
  private readonly toastService = inject(ToastService);

  handleError(error: unknown): void {
    if (this.isChunkLoadError(error)) {
      this.handleChunkLoadError(error);
      return;
    }

    this.logger.error('Unhandled application error', error);
  }

  isChunkLoadError(error: unknown): boolean {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).toLowerCase();

    return (
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('importing a module script failed')
    );
  }

  private handleChunkLoadError(error: unknown): void {
    this.logger.warn('Chunk load error detected — attempting reload', {
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      const alreadyAttempted = sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY);
      if (!alreadyAttempted) {
        sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, 'true');
        this.toastService.info('A new version is available — reloading');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }
    } catch {
      // In case sessionStorage is blocked
    }

    this.logger.error('Chunk loading failed after reload attempt', error);
  }
}

/**
 * Provides comprehensive application error handling, structured logging,
 * and chunk failure resilience.
 */
export function provideAppErrorHandling(): EnvironmentProviders {
  return makeEnvironmentProviders([
    LoggerService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: ERROR_REPORTER,
      useValue: { report: () => {} } satisfies ErrorReporter,
    },
  ]);
}
