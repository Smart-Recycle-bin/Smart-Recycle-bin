import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin } from '../handler-utils';
import {
  AdminLookupItem,
  CollectorLookupItem,
  DistrictLookupItem,
} from '@models/lookup/lookup.model';
import { CollectorListItem } from '@models/collector/collector.view-model';
import { MockAdminAccount } from '@core/mock/db/mock-db.types';

export function registerLookupHandlers(router: MockRouter): void {
  // 1. Districts Lookup
  router.get('/api/v1/admin/lookups/districts', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if ('status' in auth) return auth;

    const db = getMockDb();
    // Unique districts with region mapped from bins
    const map = new Map<string, string>();
    for (const bin of db.bins) {
      if (bin.district && !map.has(bin.district)) {
        map.set(bin.district, bin.region || 'Greater Cairo');
      }
    }

    const districts: DistrictLookupItem[] = Array.from(map.entries())
      .map(([name, region]): DistrictLookupItem => ({ name, region }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return okResponse(districts);
  });

  // 2. Collectors Lookup
  router.get('/api/v1/admin/lookups/collectors', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if ('status' in auth) return auth;

    const db = getMockDb();
    const collectors: CollectorLookupItem[] = db.collectors
      .map((c: CollectorListItem): CollectorLookupItem => ({
        collectorId: c.collectorId,
        displayName: c.name,
      }))
      .sort((a: CollectorLookupItem, b: CollectorLookupItem) =>
        a.displayName.localeCompare(b.displayName),
      );

    return okResponse(collectors);
  });

  // 3. Admins Lookup
  router.get('/api/v1/admin/lookups/admins', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if ('status' in auth) return auth;

    const db = getMockDb();
    const admins: AdminLookupItem[] = db.admins
      .map((a: MockAdminAccount): AdminLookupItem => ({
        adminId: a.user.userId,
        displayName: a.user.displayName,
      }))
      .sort((a: AdminLookupItem, b: AdminLookupItem) =>
        a.displayName.localeCompare(b.displayName),
      );

    return okResponse(admins);
  });
}
