import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin } from '../handler-utils';

export function registerAnalyticsHandlers(router: MockRouter): void {
  router.get('/api/v1/admin/analytics', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const period = ctx.query.get('period')?.toLowerCase() || 'today';

    if (period === '7d') {
      return okResponse(db.analytics.sevenDays);
    }
    if (period === '30d' || period === 'custom') {
      return okResponse(db.analytics.thirtyDays);
    }
    return okResponse(db.analytics.today);
  });
}
