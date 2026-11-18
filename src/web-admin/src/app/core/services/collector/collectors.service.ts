import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  CollectorAssignedBin,
  CollectorListItem,
  CollectorQuery,
} from '@models/collector/collector.view-model';
import { Page } from '@models/common/page.model';
import {
  CreateCollectorRequest,
  CreateCollectorResponse,
  DeactivateCollectorResponse,
  UpdateCollectorRequest,
} from '@models/collector/collector.dto';

@Injectable({
  providedIn: 'root',
})
export class CollectorsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves field collectors list with optional search and filters (PROPOSED, gap_api.md 1.5).
   */
  getCollectors(query?: CollectorQuery): Observable<Page<CollectorListItem>> {
    return this.apiClient.getPaged<CollectorListItem>(API_ENDPOINTS.collector.list, query);
  }

  /**
   * Provisions a new field collector account (APIs.md 2.7).
   */
  createCollector(req: CreateCollectorRequest): Observable<CreateCollectorResponse> {
    return this.apiClient.post<CreateCollectorResponse>(API_ENDPOINTS.collector.create, req);
  }

  /**
   * Updates an existing field collector account details (PROPOSED, gap_api.md 1.5).
   */
  updateCollector(collectorId: string, req: UpdateCollectorRequest): Observable<CollectorListItem> {
    return this.apiClient.put<CollectorListItem>(API_ENDPOINTS.collector.update(collectorId), req);
  }

  /**
   * Fetches smart bins currently assigned to a collector (PROPOSED, gap_api.md 1.5).
   */
  getAssignedBins(collectorId: string): Observable<CollectorAssignedBin[]> {
    return this.apiClient.get<CollectorAssignedBin[]>(API_ENDPOINTS.collector.assignedBins(collectorId));
  }

  /**
   * Deactivates a collector account (PROPOSED, gap_api.md 1.5).
   */
  deactivateCollector(collectorId: string): Observable<DeactivateCollectorResponse> {
    return this.apiClient.post<DeactivateCollectorResponse>(
      API_ENDPOINTS.collector.deactivate(collectorId),
      {}
    );
  }
}
