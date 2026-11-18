import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { BinStatus } from '@models/bin/bin-status.enum';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog, paginate } from '../handler-utils';
import {
  RegisterBinRequest,
  RegisterBinResponse,
  AssignBinRequest,
  AssignBinResponse,
} from '@models/bin/bin.dto';
import { BinListItem } from '@models/bin/bin.view-model';
import { BinMapItem } from '@models/bin/bin-map.model';
import { environment } from '@env/environment';

let mockDriftTick = 0;

export function resetMockDrift(): void {
  mockDriftTick = 0;
}

/**
 * Generates deterministic synthetic smart bins to exercise performance and clustering at scale.
 */
function generateMockBinsAtScale(baseBins: BinMapItem[], totalTarget: number): BinMapItem[] {
  const result: BinMapItem[] = [...baseBins];
  for (let i = baseBins.length + 1; i <= totalTarget; i++) {
    const pseudo1 = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
    const pseudo2 = Math.abs(Math.sin(i * 37.719 + 11.137) * 23421.631) % 1;
    const isAlex = pseudo1 < 0.3; // 30% Alexandria, 70% Greater Cairo

    let lat: number;
    let lng: number;
    let district: string;
    let area: string;
    let region: string;

    if (isAlex) {
      region = 'Alexandria';
      district = 'Alexandria';
      area = ['Gleem', 'Sidi Gaber', 'Montaza', 'Smouha', 'Stanley'][Math.floor(pseudo2 * 5)];
      lat = 31.18 + pseudo1 * 0.12;
      lng = 29.88 + pseudo2 * 0.16;
    } else {
      region = 'Greater Cairo';
      const districts = ['Cairo', 'Giza', 'Qalyubia'];
      district = districts[Math.floor(pseudo1 * 3)];
      area = ['Dokki', 'Nasr City', 'Maadi', 'Mohandessin', 'Zamalek', 'New Cairo'][Math.floor(pseudo2 * 6)];
      lat = 29.96 + pseudo1 * 0.22;
      lng = 31.18 + pseudo2 * 0.24;
    }

    const fillLevel = Math.floor(pseudo2 * 101);
    let status: BinStatus;
    if (pseudo1 > 0.95) {
      status = BinStatus.Offline;
    } else if (fillLevel >= 95) {
      status = BinStatus.NeedsServicing;
    } else if (fillLevel >= 80) {
      status = BinStatus.EightyPercentFull;
    } else {
      status = BinStatus.Available;
    }

    result.push({
      binId: `BIN-MOCK-${i.toString().padStart(4, '0')}`,
      name: `Smart Bin #${i} (${area})`,
      area,
      district,
      region,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      status,
      fillLevel,
      collectorName: `Collector ${(i % 6) + 1}`,
      lastServicedAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return result;
}

export function registerBinHandlers(router: MockRouter): void {
  // 1. List bins with filters (feeds Bins list table)
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

    return paginate(list, ctx.query, {
      sortable: ['name', 'fillLevel', 'status', 'lastServicedAt', 'binId', 'area', 'district'],
      defaultSort: 'binId',
      defaultDir: 'asc',
    });
  });

  // 2. Live bin map feed (PROPOSED, gap_api.md 1.3 - unpaginated, hard cap 5000 items)
  router.get('/api/v1/admin/bins/map', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();

    // Map base bins
    let items: BinMapItem[] = db.bins.map((b) => ({
      binId: b.binId,
      name: b.name,
      area: b.area,
      district: b.district,
      region: b.region ?? (b.district.toLowerCase() === 'alexandria' ? 'Alexandria' : 'Greater Cairo'),
      latitude: b.latitude,
      longitude: b.longitude,
      status: b.status,
      fillLevel: b.fillLevel,
      collectorName: b.collectorName ?? null,
      lastServicedAt: b.lastServicedAt ?? null,
      updatedAt: (b as { updatedAt?: string }).updatedAt ?? b.lastServicedAt ?? new Date().toISOString(),
    }));

    // Dev/e2e scale generation
    const targetScale = environment.mockBinCount;
    if (targetScale && targetScale > items.length) {
      items = generateMockBinsAtScale(items, targetScale);
    }

    // Dev/e2e XSS testing seed bin
    if (environment.mockXssBinSeed) {
      items.push({
        binId: 'BIN-XSS-TEST',
        name: '<img src=x onerror=alert(1)>',
        area: 'Downtown',
        district: 'Cairo',
        region: 'Greater Cairo',
        latitude: 30.045,
        longitude: 31.235,
        status: BinStatus.Available,
        fillLevel: 50,
        collectorName: null,
        lastServicedAt: null,
        updatedAt: new Date().toISOString(),
      });
    }

    // Dev/e2e live drift: deterministically nudge fill level / status
    if (environment.mockLiveDrift && items.length > 0) {
      mockDriftTick++;
      const idx = (mockDriftTick * 7) % items.length;
      const target = items[idx];
      if (target) {
        const nextFill = Math.min(100, target.fillLevel + 3);
        target.fillLevel = nextFill;
        if (nextFill >= 95 && target.status !== BinStatus.Offline) {
          target.status = BinStatus.NeedsServicing;
        } else if (nextFill >= 80 && target.status === BinStatus.Available) {
          target.status = BinStatus.EightyPercentFull;
        }
        target.updatedAt = new Date().toISOString();
      }
    }

    // Apply Region filter
    const regionParam = ctx.query.get('region')?.toLowerCase();
    if (regionParam) {
      items = items.filter(
        (b) =>
          b.region.toLowerCase() === regionParam ||
          b.district.toLowerCase() === regionParam
      );
    }

    // Apply Status filter (repeatable or comma-separated)
    const statusParams = ctx.query.getAll('status');
    if (statusParams && statusParams.length > 0) {
      const allowed = new Set(
        statusParams
          .flatMap((s) => s.split(','))
          .map((s) => s.trim().toLowerCase())
      );
      items = items.filter((b) => allowed.has(b.status.toLowerCase()));
    }

    // Apply Bounding Box (bbox=south,west,north,east)
    const bboxParam = ctx.query.get('bbox');
    if (bboxParam) {
      const coords = bboxParam.split(',').map((c) => parseFloat(c.trim()));
      if (coords.length === 4 && coords.every((n) => !isNaN(n))) {
        const [south, west, north, east] = coords;
        items = items.filter(
          (b) =>
            b.latitude >= south &&
            b.latitude <= north &&
            b.longitude >= west &&
            b.longitude <= east
        );
      }
    }

    // 5,000 item scale hard cap
    const totalItems = items.length;
    const truncated = totalItems > 5000;
    const returnedItems = truncated ? items.slice(0, 5000) : items;

    return okResponse({
      items: returnedItems,
      meta: {
        totalItems,
        returned: returnedItems.length,
        truncated,
        generatedAt: new Date().toISOString(),
      },
    });
  });

  // 2. Register smart bin (APIs.md 7.1)
  router.post<RegisterBinRequest>('/api/v1/admin/bins', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const body = ctx.req.body as RegisterBinRequest | null;
    if (!body?.deviceSerial || body?.latitude === undefined || body?.longitude === undefined) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Device serial and coordinates are required');
    }

    const db = getMockDb();

    // Check for duplicate device serial
    if (db.bins.some((b) => b.name.includes(body.deviceSerial) || b.binId === body.deviceSerial)) {
      return errorResponse(409, ApiErrorCode.DeviceAlreadyRegistered, 'Device serial is already registered');
    }

    const binId = `BIN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBin: BinListItem = {
      binId,
      name: `Smart Bin ${body.deviceSerial}`,
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
      `New bin registered: ${body.deviceSerial} in ${body.district || 'Downtown'}`,
      auth.user
    );

    const response: RegisterBinResponse = {
      binId,
      deviceSerial: body.deviceSerial,
      status: BinStatus.Available,
      fillLevel: 0,
    };

    return okResponse(response, 201);
  });

  // 3. Assign collector to bin (APIs.md 7.3)
  router.post<AssignBinRequest>('/api/v1/admin/bins/:binId/assignment', (ctx) => {
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

    // Move bin: Recalculate all collectors' assigned bins counts from actual bins data
    for (const c of db.collectors) {
      c.assignedBinsCount = db.bins.filter(
        (b) => b.collectorId === c.collectorId || b.collectorName === c.name
      ).length;
    }

    appendAuditLog(
      AuditActionType.BinAssignment,
      binId,
      `Collector ${collector.name} assigned to bin ${bin.name} (${binId})`,
      auth.user
    );

    const response: AssignBinResponse = {
      binId,
      assignedCollectorId: collector.collectorId,
      assignedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
