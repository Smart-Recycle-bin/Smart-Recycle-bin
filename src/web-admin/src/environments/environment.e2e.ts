import type { Environment } from './environment.model';
export type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  useMockBackend: true,
  mockLatencyMs: 50,
  mockAccessTokenTtlSeconds: 8,
  mockRefreshTokenTtlDays: 7,
  sessionStorageKey: 'ecobin_admin_session',
  displayTimeZone: 'Africa/Cairo',
  manualAdjustmentMaxPoints: 10000,
  appVersion: '1.0.0-e2e',
  e2e: true,
  mockBinCount: 23,
  mockLiveDrift: false,
  mockXssBinSeed: false,
};
