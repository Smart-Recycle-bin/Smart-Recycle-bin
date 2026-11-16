import { describe, it, expect } from 'vitest';
import { assertEnvironment } from './assert-environment';
import type { Environment } from './environment.model';

describe('assertEnvironment', () => {
  const baseValidProdEnv: Environment = {
    production: true,
    apiBaseUrl: '/api/v1',
    useMockBackend: false,
    mockLatencyMs: 0,
    mockAccessTokenTtlSeconds: 900,
    mockRefreshTokenTtlDays: 7,
    sessionStorageKey: 'ecobin_admin_session',
    displayTimeZone: 'Africa/Cairo',
    manualAdjustmentMaxPoints: 10000,
    appVersion: '1.0.0',
  };

  it('passes for a valid production environment', () => {
    expect(() => assertEnvironment(baseValidProdEnv)).not.toThrow();
  });

  it('throws in production when useMockBackend is true', () => {
    const invalidEnv: Environment = {
      ...baseValidProdEnv,
      useMockBackend: true,
    };

    expect(() => assertEnvironment(invalidEnv)).toThrow(
      'Production environment assertion failed: useMockBackend cannot be enabled in production.'
    );
  });

  it('throws in production when apiBaseUrl is empty or whitespace', () => {
    const emptyUrlEnv: Environment = {
      ...baseValidProdEnv,
      apiBaseUrl: '',
    };
    const whitespaceUrlEnv: Environment = {
      ...baseValidProdEnv,
      apiBaseUrl: '   ',
    };

    expect(() => assertEnvironment(emptyUrlEnv)).toThrow(
      'Production environment assertion failed: apiBaseUrl cannot be empty in production.'
    );
    expect(() => assertEnvironment(whitespaceUrlEnv)).toThrow(
      'Production environment assertion failed: apiBaseUrl cannot be empty in production.'
    );
  });

  it('does not throw in development even if useMockBackend is true or apiBaseUrl is mock', () => {
    const devEnv: Environment = {
      ...baseValidProdEnv,
      production: false,
      useMockBackend: true,
      apiBaseUrl: '',
    };

    expect(() => assertEnvironment(devEnv)).not.toThrow();
  });
});
