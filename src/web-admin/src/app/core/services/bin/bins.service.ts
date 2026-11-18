import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { BinListItem, BinQuery } from '@models/bin/bin.view-model';
import { BinMapQuery, BinMapResponse } from '@models/bin/bin-map.model';
import { Page } from '@models/common/page.model';
import {
  AssignBinRequest,
  AssignBinResponse,
  RegisterBinRequest,
  RegisterBinResponse,
} from '@models/bin/bin.dto';

@Injectable({
  providedIn: 'root',
})
export class BinsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves list of all smart bins for table view and live map (PROPOSED, gap_api.md 1.3).
   */
  getBins(query?: BinQuery): Observable<Page<BinListItem>> {
    return this.apiClient.getPaged<BinListItem>(API_ENDPOINTS.bin.list, query);
  }

  /**
   * Retrieves all smart bins for the live map feed with optional bounding box and status filters.
   * Unpaginated, returns items + meta with 5,000 items hard cap (PROPOSED, gap_api.md 1.3).
   */
  getMapBins(query?: BinMapQuery): Observable<BinMapResponse> {
    return this.apiClient.get<BinMapResponse>(API_ENDPOINTS.bin.map, {
      params: query as unknown as Record<string, unknown>,
    });
  }

  /**
   * Registers a new smart bin hardware node (APIs.md 7.1).
   */
  registerBin(req: RegisterBinRequest): Observable<RegisterBinResponse> {
    return this.apiClient.post<RegisterBinResponse>(API_ENDPOINTS.bin.register, req);
  }

  /**
   * Assigns a field collector to an existing smart bin (APIs.md 7.3).
   */
  assignCollector(binId: string, req: AssignBinRequest): Observable<AssignBinResponse> {
    return this.apiClient.post<AssignBinResponse>(API_ENDPOINTS.bin.assign(binId), req);
  }
}
