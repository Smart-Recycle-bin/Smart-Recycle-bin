export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  sessionStorageKey: string;
  displayTimeZone: string;
  manualAdjustmentMaxPoints: number;
  appVersion: string;
}
