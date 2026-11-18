import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { AccountStatus } from '@models/user/account-status.enum';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog, paginate } from '../handler-utils';
import {
  SuspendUserRequest,
  SuspendUserResponse,
  UnsuspendUserResponse,
} from '@models/user/user.dto';

export function registerUserHandlers(router: MockRouter): void {
  // 1. User search / Recyclers list with query filters (APIs.md 2.11)
  router.get('/api/v1/admin/users', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const statusFilter = ctx.query.get('status');
    const searchFilter = (ctx.query.get('query') || ctx.query.get('search'))?.toLowerCase();
    const roleFilter = ctx.query.get('role');

    let result = [...db.recyclers];

    if (roleFilter && roleFilter !== 'USER_CITIZEN') {
      // If someone queried for another role, filter accordingly (mock db has citizens as recyclers)
      result = [];
    }

    if (statusFilter) {
      result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchFilter) {
      const cleanFilter = searchFilter.replace(/[\s\-\+\(\)]/g, '');
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(searchFilter) ||
          r.email.toLowerCase().includes(searchFilter) ||
          r.userId.toLowerCase().includes(searchFilter) ||
          (!!r.phoneNumber &&
            (r.phoneNumber.toLowerCase().includes(searchFilter) ||
              (cleanFilter.length > 0 &&
                r.phoneNumber.replace(/[\s\-\+\(\)]/g, '').includes(cleanFilter))))
      );
    }

    return paginate(result, ctx.query, {
      sortable: ['name', 'status', 'availablePoints', 'lifetimePoints', 'sessions', 'joined', 'userId'],
      defaultSort: 'name',
      defaultDir: 'asc',
    });
  });

  // 2. Suspend user
  router.post<SuspendUserRequest>('/api/v1/admin/users/:userId/suspend', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const userId = ctx.params['userId'] ?? '';
    const db = getMockDb();
    const recycler = db.recyclers.find((r) => r.userId === userId);

    if (!recycler) {
      return errorResponse(404, ApiErrorCode.NotFound, `User ${userId} not found`);
    }

    const body = ctx.req.body as SuspendUserRequest | null;
    const justification = body?.reason || 'Administrative suspension';

    recycler.status = AccountStatus.Suspended;

    appendAuditLog(
      AuditActionType.UserSuspension,
      userId,
      justification,
      auth.user
    );

    const response: SuspendUserResponse = {
      userId,
      status: AccountStatus.Suspended,
      suspendedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });

  // 3. Unsuspend user
  router.post('/api/v1/admin/users/:userId/unsuspend', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const userId = ctx.params['userId'] ?? '';
    const db = getMockDb();
    const recycler = db.recyclers.find((r) => r.userId === userId);

    if (!recycler) {
      return errorResponse(404, ApiErrorCode.NotFound, `User ${userId} not found`);
    }

    recycler.status = AccountStatus.Active;

    appendAuditLog(
      AuditActionType.UserSuspension,
      userId,
      'Administrative unsuspension / reactivation',
      auth.user
    );

    const response: UnsuspendUserResponse = {
      userId,
      status: AccountStatus.Active,
      unsuspendedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
