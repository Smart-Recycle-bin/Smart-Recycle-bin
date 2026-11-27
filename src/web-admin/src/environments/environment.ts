import type { Environment } from './environment.model';
export type { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  apiBaseUrl: 'http://localhost:5121',
  sessionStorageKey: 'ecobin_admin_session',
  displayTimeZone: 'Africa/Cairo',
  manualAdjustmentMaxPoints: 10000,
  appVersion: '1.0.0',
};
