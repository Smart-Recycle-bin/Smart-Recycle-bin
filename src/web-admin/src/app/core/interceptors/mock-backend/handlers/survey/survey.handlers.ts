import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin, paginate } from '../handler-utils';

export function registerSurveyHandlers(router: MockRouter): void {
  // 1. Survey QA summary and KPI trends
  router.get('/api/v1/admin/survey-qa', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    return okResponse(db.surveyQa);
  });

  // 2. Recent post-disposal survey rows
  router.get('/api/v1/admin/survey-qa/recent', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const outcome = ctx.query.get('outcome')?.toLowerCase();
    const search = ctx.query.get('search')?.toLowerCase();

    let list = [...db.recentSurveys];

    if (outcome) {
      list = list.filter((s) => s.result.toLowerCase() === outcome);
    }

    if (search) {
      list = list.filter(
        (s) =>
          s.sessionId.toLowerCase().includes(search) ||
          s.userName.toLowerCase().includes(search) ||
          s.itemsSummary.toLowerCase().includes(search)
      );
    }

    return paginate(list, ctx.query, {
      sortable: ['sessionId', 'userName', 'points', 'result'],
      defaultSort: 'sessionId',
      defaultDir: 'asc',
    });
  });
}
