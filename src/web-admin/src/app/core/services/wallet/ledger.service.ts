import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { LedgerQuery, LedgerRow } from '@models/wallet/ledger.view-model';
import { Page } from '@models/common/page.model';
import {
  ManualAdjustmentRequest,
  ManualAdjustmentResponse,
} from '@models/wallet/ledger.dto';

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves global immutable ledger transactions with filtering (APIs.md 5.3).
   */
  getLedger(query?: LedgerQuery): Observable<Page<LedgerRow>> {
    return this.apiClient.getPaged<LedgerRow>(API_ENDPOINTS.wallet.ledger, query);
  }

  /**
   * Applies manual administrative points adjustment to user balance (APIs.md 5.4).
   * Supports optional Idempotency-Key header for duplicate protection.
   */
  adjustPoints(
    req: ManualAdjustmentRequest,
    options?: { idempotencyKey?: string }
  ): Observable<ManualAdjustmentResponse> {
    const headers: Record<string, string> = {};
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }
    return this.apiClient.post<ManualAdjustmentResponse>(
      API_ENDPOINTS.wallet.adjust,
      req,
      options?.idempotencyKey ? { headers } : undefined
    );
  }
}
