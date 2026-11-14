import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AdminRewardItem, RewardQuery } from '../../models/reward/reward.view-model';
import {
  ArchiveRewardResponse,
  CreateRewardRequest,
  UpdateRewardRequest,
} from '../../models/reward/reward.dto';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves rewards catalog items for administrative management (PROPOSED, gap_api.md 1.9).
   */
  getRewards(query?: RewardQuery): Observable<AdminRewardItem[]> {
    return this.apiClient.get<AdminRewardItem[]>(API_ENDPOINTS.reward.list, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Creates a new reward item in the catalog (APIs.md 2.13 / gap_api.md 1.9).
   */
  createReward(req: CreateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.post<AdminRewardItem>(API_ENDPOINTS.reward.create, req);
  }

  /**
   * Updates an existing reward catalog item (APIs.md 2.14 / gap_api.md 1.9).
   */
  updateReward(rewardId: string, req: UpdateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.put<AdminRewardItem>(API_ENDPOINTS.reward.update(rewardId), req);
  }

  /**
   * Archives a reward item, taking it out of circulation (APIs.md 2.15).
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
    return this.apiClient.post<{ imageUrl: string }>(API_ENDPOINTS.reward.uploadImage, formData);
  }
}
