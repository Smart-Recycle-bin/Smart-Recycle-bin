import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '../../engine/mock-router';
import { getMockDb } from '../../../../mock/db/mock-db';
import { BinStatus } from '../../../../models/bin/bin-status.enum';
import { AuditActionType } from '../../../../models/audit/audit-action-type.enum';
import { ApiErrorCode } from '../../../../models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog } from '../handler-utils';
import {
  RegisterBinRequest,
  RegisterBinResponse,
  AssignBinRequest,
  AssignBinResponse,
} from '../../../../models/bin/bin.dto';
import { BinListItem } from '../../../../models/bin/bin.view-model';

export function registerBinHandlers(router: MockRouter): void {
  // 1. List bins with filters (feeds Bins list and live map)
  router.get('/api/v1/admin/bins', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const district = ctx.query.get('district')?.toLowerCase();
    const status = ctx.query.get('status')?.toLowerCase();
    const collectorId = ctx.query.get('collectorId');
    const search = ctx.query.get('search')?.toLowerCase();

    let list = [...db.bins];

    if (district) {
      list = list.filter((b) => b.district.toLowerCase() === district);
    }

    if (status) {
      list = list.filter((b) => b.status.toLowerCase() === status);
    }

    if (collectorId) {
      list = list.filter((b) => b.collectorId === collectorId);
    }

    if (search) {
      list = list.filter(
        (b) =>
          b.binId.toLowerCase().includes(search) ||
          b.name.toLowerCase().includes(search) ||
          b.area.toLowerCase().includes(search) ||
          (b.collectorName && b.collectorName.toLowerCase().includes(search))
      );
    }

    return okResponse(list);
  });

  // 2. Register smart bin
  router.post<RegisterBinRequest>('/api/v1/admin/bins', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const body = ctx.req.body as RegisterBinRequest | null;
    if (!body?.serialNumber || body.latitude === undefined || body.longitude === undefined) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Serial number and coordinates are required');
    }

    const db = getMockDb();
    const binId = `BIN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBin: BinListItem = {
      binId,
      name: `Smart Bin ${body.serialNumber}`,
      area: body.district || 'Downtown',
      district: body.district || 'Cairo',
      region: 'Greater Cairo',
      latitude: body.latitude,
      longitude: body.longitude,
      fillLevel: 0,
      status: BinStatus.Available,
      lastServicedAt: new Date().toISOString(),
    };

    db.bins.unshift(newBin);

    appendAuditLog(
      AuditActionType.FleetUpdate,
      binId,
      `New bin registered: ${body.serialNumber} in ${body.district || 'Downtown'}`,
      auth.user
    );

    const response: RegisterBinResponse = {
      binId,
      serialNumber: body.serialNumber,
      qrCode: `https://ecobin.local/qr/${binId}`,
      status: BinStatus.Available,
      createdAt: new Date().toISOString(),
    };

    return okResponse(response, 201);
  });

  // 3. Assign collector to bin
  router.post<AssignBinRequest>('/api/v1/admin/bins/:binId/assign', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const binId = ctx.params['binId'] ?? '';
    const db = getMockDb();
    const bin = db.bins.find((b) => b.binId === binId);

    if (!bin) {
      return errorResponse(404, ApiErrorCode.BinNotFound, `Bin ${binId} not found`);
    }

    const body = ctx.req.body as AssignBinRequest | null;
    if (!body?.collectorId) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Collector ID is required');
    }

    const collector = db.collectors.find((c) => c.collectorId === body.collectorId);
    if (!collector) {
      return errorResponse(404, ApiErrorCode.NotFound, `Collector ${body.collectorId} not found`);
    }

    bin.collectorId = collector.collectorId;
    bin.collectorName = collector.name;

    // Recalculate collector assigned bins count
    collector.assignedBinsCount = db.bins.filter((b) => b.collectorId === collector.collectorId).length;

    appendAuditLog(
      AuditActionType.BinAssignment,
      binId,
      `Collector ${collector.name} assigned to bin ${bin.name} (${binId})`,
      auth.user
    );

    const response: AssignBinResponse = {
      binId,
      collectorId: collector.collectorId,
      assignedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
