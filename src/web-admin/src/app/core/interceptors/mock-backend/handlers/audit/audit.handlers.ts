import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin, paginate } from '../handler-utils';

export function registerAuditHandlers(router: MockRouter): void {
  // 1. Audit trail list with filters
  router.get('/api/v1/admin/audit-logs', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const actionType = ctx.query.get('actionType')?.toLowerCase();
    const adminId = ctx.query.get('adminId');
    const resourceId = ctx.query.get('resourceId');
    const from = ctx.query.get('from');
    const to = ctx.query.get('to');
    const search = ctx.query.get('search')?.toLowerCase();

    let list = [...db.auditLogs];

    if (actionType) {
      list = list.filter((a) => a.actionType.toLowerCase() === actionType);
    }

    if (adminId) {
      list = list.filter((a) => a.adminId === adminId);
    }

    if (resourceId) {
      list = list.filter((a) => a.resourceId.toLowerCase().includes(resourceId.toLowerCase()));
    }

    if (from) {
      list = list.filter((a) => a.timestamp >= from);
    }

    if (to) {
      list = list.filter((a) => a.timestamp <= to);
    }

    if (search) {
      list = list.filter(
        (a) =>
          a.adminName.toLowerCase().includes(search) ||
          a.resourceId.toLowerCase().includes(search) ||
          a.justification.toLowerCase().includes(search) ||
          a.auditId.toLowerCase().includes(search)
      );
    }

    return paginate(list, ctx.query, {
      sortable: ['timestamp', 'adminName', 'actionType', 'resourceId', 'auditId'],
      defaultSort: 'timestamp',
      defaultDir: 'desc',
    });
  });
}
