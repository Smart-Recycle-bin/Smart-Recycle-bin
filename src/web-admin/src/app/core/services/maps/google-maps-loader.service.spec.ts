import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { AppConfigService } from '../config/app-config.service';
import { installFakeGoogleMaps } from '@testing/fake-google-maps';

describe('GoogleMapsLoaderService', () => {
  let service: GoogleMapsLoaderService;
  let appConfigService: AppConfigService;
  let uninstallStub: () => void;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    appConfigService = TestBed.inject(AppConfigService);
    service = TestBed.inject(GoogleMapsLoaderService);

    appConfigService.resetForTesting();
    service.reset();
  });

  afterEach(() => {
    if (uninstallStub) {
      uninstallStub();
    }
    service.reset();
    appConfigService.resetForTesting();
    vi.useRealTimers();
  });

  it('marks state as not-configured without injecting any script when key is missing', async () => {
    vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: '',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    await service.load();

    expect(service.state()).toBe('not-configured');
    const script = document.getElementById(GoogleMapsLoaderService.SCRIPT_ID);
    expect(script).toBeNull();
  });

  it('injects script tag and transitions to ready when importLibrary resolves', async () => {
    uninstallStub = installFakeGoogleMaps();

    vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: 'TEST_KEY_PLACEHOLDER',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    await service.load();

    expect(service.state()).toBe('ready');
  });

  it('never loads twice when already ready', async () => {
    uninstallStub = installFakeGoogleMaps();

    const loadConfigSpy = vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: 'TEST_KEY_PLACEHOLDER',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    await service.load();
    await service.load();

    expect(loadConfigSpy).toHaveBeenCalledTimes(1);
    expect(service.state()).toBe('ready');
  });

  it('sets auth-failed state when window.gm_authFailure is invoked', async () => {
    vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: 'INVALID_OR_UNAUTHORIZED_KEY',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    // Start loading
    void service.load();
    await Promise.resolve();
    expect(service.state()).toBe('loading');

    // Simulate Google Maps invoking gm_authFailure
    const gmAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    expect(gmAuthFailure).toBeDefined();
    gmAuthFailure!();

    expect(service.state()).toBe('auth-failed');
  });

  it('transitions to timeout state when loading exceeds 15 seconds', async () => {
    vi.useFakeTimers();

    vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: 'VALID_KEY_SLOW_NETWORK',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    const loadPromise = service.load().catch((err) => err);
    await vi.advanceTimersByTimeAsync(10);
    expect(service.state()).toBe('loading');

    // Advance past 15 seconds
    await vi.advanceTimersByTimeAsync(GoogleMapsLoaderService.LOAD_TIMEOUT_MS + 100);

    const error = await loadPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('timed out');
    expect(service.state()).toBe('timeout');
  });

  it('transitions to network-error when script fails to load', async () => {
    vi.spyOn(appConfigService, 'loadConfig').mockResolvedValue({
      googleMaps: {
        apiKey: 'VALID_KEY',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: { refreshSeconds: 30 },
    });

    const loadPromise = service.load().catch((err) => err);
    await Promise.resolve();
    expect(service.state()).toBe('loading');

    const script = document.getElementById(GoogleMapsLoaderService.SCRIPT_ID) as HTMLScriptElement;
    expect(script).toBeTruthy();

    // Trigger script error
    script.dispatchEvent(new Event('error'));

    const error = await loadPromise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('network error');
    expect(service.state()).toBe('network-error');
  });

  it('cleans up script and resets to idle on reset()', () => {
    const dummyScript = document.createElement('script');
    dummyScript.id = GoogleMapsLoaderService.SCRIPT_ID;
    document.head.appendChild(dummyScript);

    service.reset();

    expect(service.state()).toBe('idle');
    expect(document.getElementById(GoogleMapsLoaderService.SCRIPT_ID)).toBeNull();
  });
});
