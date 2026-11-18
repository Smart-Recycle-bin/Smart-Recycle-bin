import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin, paginate } from '../handler-utils';

export function registerGamificationHandlers(router: MockRouter): void {
  // 1. Leaderboard rankings by scope (APIs.md 5.5)
  router.get('/api/v1/leaderboard', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const scope = ctx.query.get('scope')?.toLowerCase();

    let list = db.leaderboards.weekly;
    if (scope === 'monthly') {
      list = db.leaderboards.monthly;
    } else if (scope === 'all-time' || scope === 'alltime') {
      list = db.leaderboards.allTime;
    }

    return paginate(list, ctx.query, {
      sortable: ['rank', 'displayName', 'lifetimePoints', 'recyclingVolumeKg'],
      defaultSort: 'rank',
      defaultDir: 'asc',
    });
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
