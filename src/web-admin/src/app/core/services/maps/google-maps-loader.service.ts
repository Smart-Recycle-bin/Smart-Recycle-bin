import { inject, Injectable, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';

export type GoogleMapsLoaderState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'not-configured'
  | 'auth-failed'
  | 'network-error'
  | 'timeout';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  private readonly appConfigService = inject(AppConfigService);

  private readonly _state = signal<GoogleMapsLoaderState>('idle');
  readonly state = this._state.asReadonly();

  static readonly SCRIPT_ID = 'google-maps-bootstrap';
  static readonly LOAD_TIMEOUT_MS = 15000;

  private inFlightPromise: Promise<void> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.installAuthFailureHook();
  }

  /**
   * Loads the Google Maps JavaScript API libraries asynchronously.
   * If already loaded or ready, resolves immediately.
   * If no API key is configured, sets state to 'not-configured' without making network calls.
   */
  async load(): Promise<void> {
    if (this._state() === 'ready') {
      return;
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = this.executeLoad();
    try {
      await this.inFlightPromise;
    } finally {
      this.inFlightPromise = null;
    }
  }

  private async executeLoad(): Promise<void> {
    const config = await this.appConfigService.loadConfig();
    const apiKey = config?.googleMaps.apiKey?.trim();

    if (!config || !apiKey) {
      this._state.set('not-configured');
      return;
    }

    const mapsConfig = config.googleMaps;

    // If already in an unrecoverable failure in current attempt, don't re-run without reset
    if (this._state() === 'auth-failed') {
      return;
    }

    this._state.set('loading');
    this.installAuthFailureHook();

    return new Promise<void>((resolve, reject) => {
      // 15-second load timeout
      this.timeoutTimer = setTimeout(() => {
        if (this._state() === 'loading') {
          this._state.set('timeout');
          reject(new Error('Google Maps script load timed out.'));
        }
      }, GoogleMapsLoaderService.LOAD_TIMEOUT_MS);

      // If google.maps.importLibrary is already present on window (e.g., test stub or preloaded)
      const existingGoogle = (window as unknown as { google?: { maps?: { importLibrary?: (name: string) => Promise<unknown> } } }).google;
      if (typeof existingGoogle?.maps?.importLibrary === 'function') {
        this.loadLibraries(existingGoogle.maps.importLibrary)
          .then(() => {
            this.handleSuccess(resolve);
          })
          .catch((err) => {
            this.handleError(err, reject);
          });
        return;
      }

      // Check if script tag is already in DOM
      let script = document.getElementById(GoogleMapsLoaderService.SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = GoogleMapsLoaderService.SCRIPT_ID;
        script.type = 'text/javascript';
        script.async = true;

        const { version, language, region } = mapsConfig;
        const params = new URLSearchParams({
          key: apiKey,
          v: version,
          loading: 'async',
          libraries: 'marker',
          language,
          region,
        });

        script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

        script.onerror = () => {
          this.clearTimer();
          this._state.set('network-error');
          reject(new Error('Google Maps script failed to load (network error).'));
        };

        document.head.appendChild(script);
      }

      // Poll/wait for google.maps.importLibrary to become available
      const checkInterval = setInterval(() => {
        if (this._state() === 'timeout' || this._state() === 'auth-failed' || this._state() === 'network-error') {
          clearInterval(checkInterval);
          return;
        }

        const winGoogle = (window as unknown as { google?: { maps?: { importLibrary?: (name: string) => Promise<unknown> } } }).google;
        if (typeof winGoogle?.maps?.importLibrary === 'function') {
          clearInterval(checkInterval);
          this.loadLibraries(winGoogle.maps.importLibrary)
            .then(() => {
              this.handleSuccess(resolve);
            })
            .catch((err) => {
              this.handleError(err, reject);
            });
        }
      }, 50);
    });
  }

  private async loadLibraries(importLib: (name: string) => Promise<unknown>): Promise<void> {
    await Promise.all([
      importLib('maps'),
      importLib('marker'),
      importLib('core'),
    ]);
  }

  private handleSuccess(resolve: () => void): void {
    this.clearTimer();
    if (this._state() !== 'auth-failed' && this._state() !== 'timeout') {
      this._state.set('ready');
      resolve();
    }
  }

  private handleError(err: unknown, reject: (err: unknown) => void): void {
    this.clearTimer();
    if (this._state() !== 'auth-failed' && this._state() !== 'timeout') {
      this._state.set('network-error');
    }
    reject(err);
  }

  private clearTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private installAuthFailureHook(): void {
    if (typeof window !== 'undefined') {
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
        this.clearTimer();
        this._state.set('auth-failed');
      };
    }
  }

  /**
   * Resets the loader state, cancels pending timers, and removes any injected script tags.
   */
  reset(): void {
    this.clearTimer();
    this.inFlightPromise = null;
    this._state.set('idle');

    if (typeof document !== 'undefined') {
      const script = document.getElementById(GoogleMapsLoaderService.SCRIPT_ID);
      script?.remove();
    }
  }
}
