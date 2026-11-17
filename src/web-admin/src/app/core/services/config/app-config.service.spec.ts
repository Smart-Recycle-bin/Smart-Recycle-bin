import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppConfigService);
    service.resetForTesting();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    service.resetForTesting();
  });

  it('loads valid configuration and marks status ready', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        googleMaps: {
          apiKey: 'TEST_KEY_NOT_REAL_123',
          mapId: 'CUSTOM_MAP_ID',
          version: 'weekly',
          language: 'ar',
          region: 'SA',
        },
        map: {
          refreshSeconds: 45,
        },
      }),
    } as unknown as Response);

    const config = await service.loadConfig();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
    expect(service.status()).toBe('ready');
    expect(config).toEqual({
      googleMaps: {
        apiKey: 'TEST_KEY_NOT_REAL_123',
        mapId: 'CUSTOM_MAP_ID',
        version: 'weekly',
        language: 'ar',
        region: 'SA',
      },
      map: {
        refreshSeconds: 45,
      },
    });
  });

  it('detects missing API key and marks status missing-key without throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        googleMaps: {
          apiKey: '   ',
        },
        map: {
          refreshSeconds: 30,
        },
      }),
    } as unknown as Response);

    const config = await service.loadConfig();

    expect(service.status()).toBe('missing-key');
    expect(config?.googleMaps.apiKey).toBe('');
    expect(config?.googleMaps.mapId).toBe('DEMO_MAP_ID');
  });

  it('applies default values when optional fields are omitted', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        googleMaps: {
          apiKey: 'VALID_TEST_KEY',
        },
      }),
    } as unknown as Response);

    const config = await service.loadConfig();

    expect(service.status()).toBe('ready');
    expect(config).toEqual({
      googleMaps: {
        apiKey: 'VALID_TEST_KEY',
        mapId: 'DEMO_MAP_ID',
        version: 'quarterly',
        language: 'en',
        region: 'EG',
      },
      map: {
        refreshSeconds: 30,
      },
    });
  });

  it('clamps refreshSeconds to a minimum of 5 seconds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        googleMaps: {
          apiKey: 'VALID_KEY',
        },
        map: {
          refreshSeconds: 2, // Less than minimum 5
        },
      }),
    } as unknown as Response);

    const config = await service.loadConfig();

    expect(config?.map.refreshSeconds).toBe(5);
  });

  it('handles HTTP error responses gracefully by setting status to error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const config = await service.loadConfig();

    expect(config).toBeNull();
    expect(service.status()).toBe('error');
  });

  it('handles fetch network rejection gracefully by setting status to error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const config = await service.loadConfig();

    expect(config).toBeNull();
    expect(service.status()).toBe('error');
  });

  it('caches the configuration and does not re-fetch on subsequent calls', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        googleMaps: { apiKey: 'KEY' },
      }),
    } as unknown as Response);
    globalThis.fetch = fetchSpy;

    await service.loadConfig();
    await service.loadConfig();
    const config = service.getConfig();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(config?.googleMaps.apiKey).toBe('KEY');
  });
});
