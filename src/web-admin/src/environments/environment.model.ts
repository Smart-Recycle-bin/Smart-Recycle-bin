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
}
