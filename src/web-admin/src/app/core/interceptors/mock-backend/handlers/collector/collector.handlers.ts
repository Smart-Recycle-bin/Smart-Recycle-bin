import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { AccountStatus } from '@models/user/account-status.enum';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog, paginate } from '../handler-utils';
import {
  CreateCollectorRequest,
  UpdateCollectorRequest,
  DeactivateCollectorResponse,
} from '@models/collector/collector.dto';
import { CollectorListItem, CollectorAssignedBin } from '@models/collector/collector.view-model';

export function registerCollectorHandlers(router: MockRouter): void {
  // 1. List collectors with filtering
  router.get('/api/v1/admin/collectors', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();

    // Derived from data (single source of truth): assignedBinsCount comes from actual bins data
    for (const c of db.collectors) {
      c.assignedBinsCount = db.bins.filter(
        (b) => b.collectorId === c.collectorId || b.collectorName === c.name
      ).length;
    }

    const search = ctx.query.get('search')?.toLowerCase();
    const district = ctx.query.get('district')?.toLowerCase();
    const status = ctx.query.get('status')?.toLowerCase();

    let list = [...db.collectors];

    if (search) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search)
      );
    }

    if (district) {
      list = list.filter((c) => c.district.toLowerCase() === district);
    }

    if (status) {
      list = list.filter((c) => c.status.toLowerCase() === status);
    }

    return paginate(list, ctx.query, {
      sortable: ['name', 'district', 'status', 'assignedBinsCount', 'lastActiveAt', 'collectorId'],
      defaultSort: 'collectorId',
      defaultDir: 'asc',
    });
  });

  // 2. Create collector (APIs.md 2.7)
  router.post<CreateCollectorRequest>('/api/v1/admin/collectors', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const body = ctx.req.body as CreateCollectorRequest | null;
    if (!body?.email || !body?.displayName) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Name and email are required');
    }

    const db = getMockDb();
    if (db.collectors.some((c) => c.email.toLowerCase() === body.email.toLowerCase())) {
      return errorResponse(409, ApiErrorCode.EmailAlreadyExists, 'Email already exists');
    }

    const collectorId = `col_${Date.now().toString(36)}`;
    const initials =
      body.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'CO';

    const district = body.district || 'Downtown';

    const newCollector: CollectorListItem = {
      collectorId,
      name: body.displayName,
      initials,
      district,
      email: body.email,
      phone: body.phoneNumber || '+20 100 000 0000',
      assignedBinsCount: 0,
      status: AccountStatus.Active,
      lastActiveAt: new Date().toISOString(),
    };

    db.collectors.unshift(newCollector);

    appendAuditLog(
      AuditActionType.CollectorProvisioning,
      collectorId,
      `Collector provisioned: ${body.displayName} (${body.email})`,
      auth.user
    );

    return okResponse(newCollector, 201);
  });

  // 3. Update collector (PROPOSED, gap_api.md 1.5)
  router.put<UpdateCollectorRequest>('/api/v1/admin/collectors/:collectorId', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const collectorId = ctx.params['collectorId'] ?? '';
    const db = getMockDb();
    const collector = db.collectors.find((c) => c.collectorId === collectorId);

    if (!collector) {
      return errorResponse(404, ApiErrorCode.NotFound, `Collector ${collectorId} not found`);
    }

    const body = ctx.req.body as UpdateCollectorRequest | null;
    if (body?.displayName) {
      collector.name = body.displayName;
    }
    if (body?.email) {
      collector.email = body.email;
    }
    if (body?.phoneNumber) {
      collector.phone = body.phoneNumber;
    }
    if (body?.district) {
      collector.district = body.district;
    }

    appendAuditLog(
      AuditActionType.FleetUpdate,
      collectorId,
      `Collector profile updated: ${collector.name}`,
      auth.user
    );

    return okResponse(collector);
  });

  // 4. View collector assigned bins (PROPOSED, gap_api.md 1.5)
  router.get('/api/v1/admin/collectors/:collectorId/bins', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const collectorId = ctx.params['collectorId'] ?? '';
    const db = getMockDb();
    const collector = db.collectors.find((c) => c.collectorId === collectorId);

    if (!collector) {
      return errorResponse(404, ApiErrorCode.NotFound, `Collector ${collectorId} not found`);
    }

    // Find all bins assigned to this collector
    const assignedBins: CollectorAssignedBin[] = db.bins
      .filter((b) => b.collectorId === collectorId || b.collectorName === collector.name)
      .map((b) => ({
        binId: b.binId,
        name: b.name,
        area: b.area,
        district: b.district,
        fillLevel: b.fillLevel,
        status: b.status,
        lastServicedAt: b.lastServicedAt,
      }));

    return okResponse(assignedBins);
  });

  // 5. Deactivate collector account (PROPOSED, gap_api.md 1.5)
  router.post('/api/v1/admin/collectors/:collectorId/deactivate', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const collectorId = ctx.params['collectorId'] ?? '';
    const db = getMockDb();
    const collector = db.collectors.find((c) => c.collectorId === collectorId);

    if (!collector) {
      return errorResponse(404, ApiErrorCode.NotFound, `Collector ${collectorId} not found`);
    }

    collector.status = AccountStatus.Inactive;

    appendAuditLog(
      AuditActionType.FleetUpdate,
      collectorId,
      `Collector account deactivated: ${collector.name}`,
      auth.user
    );

    const response: DeactivateCollectorResponse = {
      collectorId,
      status: AccountStatus.Inactive,
      deactivatedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
