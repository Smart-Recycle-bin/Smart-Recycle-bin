import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AuditLogQuery, AuditLogRow } from '../../models/audit/audit.view-model';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves administrative audit log records with filtering (PROPOSED, gap_api.md 1.11).
   */
  getAuditLogs(query?: AuditLogQuery): Observable<AuditLogRow[]> {
    return this.apiClient.get<AuditLogRow[]>(API_ENDPOINTS.audit.list, {
      params: query as Record<string, unknown>,
    });
  }
}
