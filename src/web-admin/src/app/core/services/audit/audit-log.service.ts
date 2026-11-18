import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AuditLogQuery, AuditLogRow } from '@models/audit/audit.view-model';
import { Page } from '@models/common/page.model';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves administrative audit log records with filtering (APIs.md 7.8).
   */
  getAuditLogs(query?: AuditLogQuery): Observable<Page<AuditLogRow>> {
    return this.apiClient.getPaged<AuditLogRow>(API_ENDPOINTS.audit.list, query);
  }
}
