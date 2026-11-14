import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { BinListItem, BinQuery } from '../../models/bin/bin.view-model';
import {
  AssignBinRequest,
  AssignBinResponse,
  RegisterBinRequest,
  RegisterBinResponse,
} from '../../models/bin/bin.dto';

@Injectable({
  providedIn: 'root',
})
export class BinsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves list of all smart bins for table view and live map (PROPOSED, gap_api.md 1.3).
   */
  getBins(query?: BinQuery): Observable<BinListItem[]> {
    return this.apiClient.get<BinListItem[]>(API_ENDPOINTS.bin.list, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Registers a new smart bin hardware node (APIs.md 2.11).
   */
  registerBin(req: RegisterBinRequest): Observable<RegisterBinResponse> {
    return this.apiClient.post<RegisterBinResponse>(API_ENDPOINTS.bin.register, req);
  }

  /**
   * Assigns a field collector to an existing smart bin (APIs.md 2.12).
   */
  assignCollector(binId: string, req: AssignBinRequest): Observable<AssignBinResponse> {
    return this.apiClient.post<AssignBinResponse>(API_ENDPOINTS.bin.assign(binId), req);
  }
}
