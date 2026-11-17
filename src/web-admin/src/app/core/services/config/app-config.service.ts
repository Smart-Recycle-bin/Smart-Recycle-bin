import { Injectable, signal } from '@angular/core';

export interface GoogleMapsConfig {
  apiKey: string;
  mapId: string;
  version: string;
  language: string;
  region: string;
}

export interface MapSettingsConfig {
  refreshSeconds: number;
}

export interface AppConfig {
  googleMaps: GoogleMapsConfig;
  map: MapSettingsConfig;
}

export type AppConfigStatus = 'idle' | 'ready' | 'missing-key' | 'error';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {
  private readonly _status = signal<AppConfigStatus>('idle');
  readonly status = this._status.asReadonly();

  private readonly _config = signal<AppConfig | null>(null);
  readonly config = this._config.asReadonly();

  private cachedPromise: Promise<AppConfig | null> | null = null;

  /**
   * Loads runtime configuration lazily from /config.json with cache: 'no-store'.
   * Subsequent calls return the cached in-memory configuration.
   */
  loadConfig(): Promise<AppConfig | null> {
    if (this.cachedPromise) {
      return this.cachedPromise;
    }

    this.cachedPromise = (async () => {
      try {
        const response = await fetch('/config.json', { cache: 'no-store' });
        if (!response.ok) {
          this._status.set('error');
          return null;
        }

        const rawData = await response.json();
        const validated = this.validateAndNormalizeConfig(rawData);

        this._config.set(validated);

        if (!validated.googleMaps.apiKey || validated.googleMaps.apiKey.trim() === '') {
          this._status.set('missing-key');
        } else {
          this._status.set('ready');
        }

        return validated;
      } catch {
        this._status.set('error');
        return null;
      }
    })();

    return this.cachedPromise;
  }

  /**
   * Returns current cached configuration if loaded.
   */
  getConfig(): AppConfig | null {
    return this._config();
  }

  /**
   * Normalizes raw JSON according to schema, injecting defaults and clamping refreshSeconds >= 5.
   */
  private validateAndNormalizeConfig(raw: unknown): AppConfig {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Config must be a valid JSON object');
    }

    const obj = raw as Record<string, unknown>;
    const rawMaps = (obj['googleMaps'] && typeof obj['googleMaps'] === 'object'
      ? obj['googleMaps']
      : {}) as Record<string, unknown>;
    const rawMapSettings = (obj['map'] && typeof obj['map'] === 'object'
      ? obj['map']
      : {}) as Record<string, unknown>;

    const apiKey = typeof rawMaps['apiKey'] === 'string' ? rawMaps['apiKey'].trim() : '';
    const mapId = typeof rawMaps['mapId'] === 'string' && rawMaps['mapId'].trim() !== ''
      ? rawMaps['mapId'].trim()
      : 'DEMO_MAP_ID';
    const version = typeof rawMaps['version'] === 'string' && rawMaps['version'].trim() !== ''
      ? rawMaps['version'].trim()
      : 'quarterly';
    const language = typeof rawMaps['language'] === 'string' && rawMaps['language'].trim() !== ''
      ? rawMaps['language'].trim()
      : 'en';
    const region = typeof rawMaps['region'] === 'string' && rawMaps['region'].trim() !== ''
      ? rawMaps['region'].trim()
      : 'EG';

    const rawRefresh = Number(rawMapSettings['refreshSeconds']);
    const refreshSeconds = !isNaN(rawRefresh) && rawRefresh > 0
      ? Math.max(5, Math.floor(rawRefresh))
      : 30;

    return {
      googleMaps: {
        apiKey,
        mapId,
        version,
        language,
        region,
      },
      map: {
        refreshSeconds,
      },
    };
  }

  /**
   * Resets internal cache and status for isolated unit testing.
   */
  resetForTesting(): void {
    this.cachedPromise = null;
    this._status.set('idle');
    this._config.set(null);
  }
}
