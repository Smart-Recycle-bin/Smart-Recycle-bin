import type { Environment } from './environment.model';
export type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  useMockBackend: true,
  mockLatencyMs: 400,
  mockAccessTokenTtlSeconds: 900,
  mockRefreshTokenTtlDays: 7,
  sessionStorageKey: 'ecobin_admin_session',
  displayTimeZone: 'Africa/Cairo',
  manualAdjustmentMaxPoints: 10000,
  appVersion: '1.0.0-dev',
  e2e: false,
  mockBinCount: 23,
  mockLiveDrift: false,
  mockXssBinSeed: false,
};
