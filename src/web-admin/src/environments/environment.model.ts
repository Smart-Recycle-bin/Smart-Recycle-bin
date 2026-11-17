export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  useMockBackend: boolean;
  mockLatencyMs: number;
  mockAccessTokenTtlSeconds: number;
  mockRefreshTokenTtlDays: number;
  sessionStorageKey: string;
  displayTimeZone: string;
  manualAdjustmentMaxPoints: number;
  appVersion: string;
  e2e?: boolean;
  mockBinCount?: number;
  mockLiveDrift?: boolean;
  mockXssBinSeed?: boolean;
}
