import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '../../engine/mock-router';
import { getMockDb } from '../../../../mock/db/mock-db';
import { AccountStatus } from '../../../../models/user/account-status.enum';
import { AuditActionType } from '../../../../models/audit/audit-action-type.enum';
import { ApiErrorCode } from '../../../../models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog } from '../handler-utils';
import {
  SuspendUserRequest,
  SuspendUserResponse,
  UnsuspendUserResponse,
} from '../../../../models/user/user.dto';

export function registerUserHandlers(router: MockRouter): void {
  // 1. Recyclers list with query filters
  router.get('/api/v1/admin/recyclers', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const statusFilter = ctx.query.get('status');
    const searchFilter = ctx.query.get('search')?.toLowerCase();

    let result = [...db.recyclers];

    if (statusFilter) {
      result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchFilter) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(searchFilter) ||
          r.email.toLowerCase().includes(searchFilter) ||
          r.userId.toLowerCase().includes(searchFilter)
      );
    }

    return okResponse(result);
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
      accountStatus: AccountStatus.Suspended,
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
      accountStatus: AccountStatus.Active,
      unsuspendedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
