import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import {
  AdminLookupItem,
  CollectorLookupItem,
  DistrictLookupItem,
} from '@models/lookup/lookup.model';

@Injectable({
  providedIn: 'root',
})
export class LookupsService {
  private readonly api = inject(ApiClientService);

  private districts$?: Observable<DistrictLookupItem[]>;
  private collectors$?: Observable<CollectorLookupItem[]>;
  private admins$?: Observable<AdminLookupItem[]>;

  /**
   * Fetches district lookup items ({ name, region }), cached with shareReplay(1).
   */
  getDistricts(): Observable<DistrictLookupItem[]> {
    if (!this.districts$) {
      this.districts$ = this.api
        .get<DistrictLookupItem[]>('/admin/lookups/districts')
        .pipe(shareReplay(1));
    }
    return this.districts$;
  }

  /**
   * Fetches collector lookup items ({ collectorId, displayName }), cached with shareReplay(1).
   */
  getCollectors(): Observable<CollectorLookupItem[]> {
    if (!this.collectors$) {
      this.collectors$ = this.api
        .get<CollectorLookupItem[]>('/admin/lookups/collectors')
        .pipe(shareReplay(1));
    }
    return this.collectors$;
  }

  /**
   * Fetches admin lookup items ({ adminId, displayName }), cached with shareReplay(1).
   */
  getAdmins(): Observable<AdminLookupItem[]> {
    if (!this.admins$) {
      this.admins$ = this.api
        .get<AdminLookupItem[]>('/admin/lookups/admins')
        .pipe(shareReplay(1));
    }
    return this.admins$;
  }

  /**
   * Invalidates lookup cache for a specific domain or all domains.
   */
  invalidate(target?: 'collectors' | 'districts' | 'admins' | 'all'): void {
    if (!target || target === 'all') {
      this.districts$ = undefined;
      this.collectors$ = undefined;
      this.admins$ = undefined;
    } else if (target === 'collectors') {
      this.collectors$ = undefined;
    } else if (target === 'districts') {
      this.districts$ = undefined;
    } else if (target === 'admins') {
      this.admins$ = undefined;
    }
  }

  invalidateCollectors(): void {
    this.invalidate('collectors');
  }

  invalidateDistricts(): void {
    this.invalidate('districts');
  }

  invalidateAdmins(): void {
    this.invalidate('admins');
  }
}
