import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { LedgerQuery, LedgerRow } from '../../models/wallet/ledger.view-model';
import {
  ManualAdjustmentRequest,
  ManualAdjustmentResponse,
} from '../../models/wallet/ledger.dto';

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves global immutable ledger transactions with filtering (APIs.md 5.3).
   */
  getLedger(query?: LedgerQuery): Observable<LedgerRow[]>{
    return this.apiClient.get<LedgerRow[]>(API_ENDPOINTS.wallet.ledger, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Applies manual administrative points adjustment to user balance (APIs.md 5.4).
   */
  adjustPoints(req: ManualAdjustmentRequest): Observable<ManualAdjustmentResponse> {
    return this.apiClient.post<ManualAdjustmentResponse>(API_ENDPOINTS.wallet.adjust, req);
  }
}
