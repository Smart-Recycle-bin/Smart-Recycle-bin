import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '../../engine/mock-router';
import { getMockDb } from '../../../../mock/db/mock-db';
import { okResponse, requireSysAdmin } from '../handler-utils';

export function registerGamificationHandlers(router: MockRouter): void {
  // 1. Leaderboard rankings by scope
  router.get('/api/v1/admin/leaderboard', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const scope = ctx.query.get('scope')?.toLowerCase();

    if (scope === 'monthly') {
      return okResponse(db.leaderboards.monthly);
    }
    if (scope === 'all-time' || scope === 'alltime') {
      return okResponse(db.leaderboards.allTime);
    }
    return okResponse(db.leaderboards.weekly);
  });

  // 2. Milestone badges catalog
  router.get('/api/v1/admin/badges', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    return okResponse(db.badges);
  });
}
