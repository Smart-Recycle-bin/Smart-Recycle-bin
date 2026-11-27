import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
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
  private fetchCached<T>(endpoint: string, clearCache: () => void): Observable<T> {
    return this.api.get<T>(endpoint).pipe(
      catchError((error) => {
        clearCache();
        return throwError(() => error);
      }),
      shareReplay(1)
    );
  }

  getDistricts(): Observable<DistrictLookupItem[]> {
    if (!this.districts$) {
      this.districts$ = this.fetchCached<DistrictLookupItem[]>(
        API_ENDPOINTS.lookups.districts,
        () => {
          this.districts$ = undefined;
        }
      );
    }
    return this.districts$;
  }

  /**
   * Fetches collector lookup items ({ collectorId, displayName }), cached with shareReplay(1).
   */
  getCollectors(): Observable<CollectorLookupItem[]> {
    if (!this.collectors$) {
      this.collectors$ = this.fetchCached<CollectorLookupItem[]>(
        API_ENDPOINTS.lookups.collectors,
        () => {
          this.collectors$ = undefined;
        }
      );
    }
    return this.collectors$;
  }

  /**
   * Fetches admin lookup items ({ adminId, displayName }), cached with shareReplay(1).
   */
  getAdmins(): Observable<AdminLookupItem[]> {
    if (!this.admins$) {
      this.admins$ = this.fetchCached<AdminLookupItem[]>(
        API_ENDPOINTS.lookups.admins,
        () => {
          this.admins$ = undefined;
        }
      );
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
