import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpContext } from '@angular/common/http';
import { REQUEST_TIMEOUT } from '@core/interceptors/shared/http-context-tokens';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AdminRewardItem, RewardQuery } from '@models/reward/reward.view-model';
import {
  ArchiveRewardResponse,
  CreateRewardRequest,
  UpdateRewardRequest,
} from '@models/reward/reward.dto';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves rewards catalog items for administrative management (PROPOSED under documented prefix).
   */
  getRewards(query?: RewardQuery): Observable<AdminRewardItem[]> {
    return this.apiClient.get<AdminRewardItem[]>(API_ENDPOINTS.reward.list, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Creates a new reward item in the catalog (APIs.md 6.2).
   */
  createReward(req: CreateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.post<AdminRewardItem>(API_ENDPOINTS.reward.create, req);
  }

  /**
   * Updates an existing reward catalog item (APIs.md 6.3).
   */
  updateReward(rewardId: string, req: UpdateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.put<AdminRewardItem>(API_ENDPOINTS.reward.update(rewardId), req);
  }

  /**
   * Archives a reward item, taking it out of circulation (APIs.md 6.4).
   */
  archiveReward(rewardId: string): Observable<ArchiveRewardResponse> {
    return this.apiClient.post<ArchiveRewardResponse>(API_ENDPOINTS.reward.archive(rewardId), {});
  }

  /**
   * Uploads reward voucher image asset (PROPOSED, gap_api.md 1.9).
   */
  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const context = new HttpContext().set(REQUEST_TIMEOUT, 120_000);
    return this.apiClient.post<{ imageUrl: string }>(API_ENDPOINTS.reward.uploadImage, formData, { context });
  }
}
