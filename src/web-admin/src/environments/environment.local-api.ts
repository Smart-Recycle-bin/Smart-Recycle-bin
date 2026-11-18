import type { Environment } from './environment.model';
export type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  useMockBackend: false,
  mockLatencyMs: 0,
  mockAccessTokenTtlSeconds: 900,
  mockRefreshTokenTtlDays: 7,
  sessionStorageKey: 'ecobin_admin_session',
  displayTimeZone: 'Africa/Cairo',
  manualAdjustmentMaxPoints: 10000,
  appVersion: '1.0.0-local-api',
  e2e: false,
  mockBinCount: undefined,
  mockLiveDrift: false,
  mockXssBinSeed: false,
};
