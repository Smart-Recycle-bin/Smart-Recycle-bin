import { describe, it, expect } from 'vitest';
import { assertEnvironment } from './assert-environment';
import type { Environment } from './environment.model';

describe('assertEnvironment', () => {
  const baseValidEnv: Environment = {
    production: true,
    apiBaseUrl: 'http://localhost:5121',
    sessionStorageKey: 'ecobin_admin_session',
    displayTimeZone: 'Africa/Cairo',
    manualAdjustmentMaxPoints: 10000,
    appVersion: '1.0.0',
  };

  it('passes for a valid environment configuration', () => {
    expect(() => assertEnvironment(baseValidEnv)).not.toThrow();
  });

  it('throws when apiBaseUrl is empty or whitespace', () => {
    const emptyUrlEnv: Environment = {
      ...baseValidEnv,
      apiBaseUrl: '',
    };
    const whitespaceUrlEnv: Environment = {
      ...baseValidEnv,
      apiBaseUrl: '   ',
    };

    expect(() => assertEnvironment(emptyUrlEnv)).toThrow(
      'Environment assertion failed: apiBaseUrl cannot be empty.'
    );
    expect(() => assertEnvironment(whitespaceUrlEnv)).toThrow(
      'Environment assertion failed: apiBaseUrl cannot be empty.'
    );
  });
});
