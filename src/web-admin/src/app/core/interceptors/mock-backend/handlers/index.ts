import { MockRouter } from '../engine/mock-router';
import { registerAuthHandlers } from './auth/auth.handlers';
import { registerUserHandlers } from './user/user.handlers';
import { registerCollectorHandlers } from './collector/collector.handlers';
import { registerBinHandlers } from './bin/bin.handlers';
import { registerAnalyticsHandlers } from './analytics/analytics.handlers';
import { registerInspectionHandlers } from './inspection/inspection.handlers';
import { registerSurveyHandlers } from './survey/survey.handlers';
import { registerWalletHandlers } from './wallet/wallet.handlers';
import { registerRewardHandlers } from './reward/reward.handlers';
import { registerGamificationHandlers } from './gamification/gamification.handlers';
import { registerAuditHandlers } from './audit/audit.handlers';
import { registerNotificationHandlers } from './notification/notification.handlers';
import { registerLookupHandlers } from './lookup/lookup.handlers';

export function registerAllMockHandlers(router: MockRouter): void {
  registerAuthHandlers(router);
  registerUserHandlers(router);
  registerCollectorHandlers(router);
  registerBinHandlers(router);
  registerAnalyticsHandlers(router);
  registerInspectionHandlers(router);
  registerSurveyHandlers(router);
  registerWalletHandlers(router);
  registerRewardHandlers(router);
  registerGamificationHandlers(router);
  registerAuditHandlers(router);
  registerNotificationHandlers(router);
  registerLookupHandlers(router);
}
