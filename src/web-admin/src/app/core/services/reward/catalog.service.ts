import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpContext } from '@angular/common/http';
import { REQUEST_TIMEOUT } from '@core/interceptors/shared/http-context-tokens';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { AdminRewardItem, RewardQuery } from '@models/reward/reward.view-model';
import { Id } from '@models/common/id.model';
import { Page } from '@models/common/page.model';
import {
  ArchiveRewardResponse,
  CreateRewardRequest,
  RewardCategoryItem,
  UpdateRewardRequest,
} from '@models/reward/reward.dto';

@Injectable({
  providedIn: 'root',
})
export class CatalogService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves paginated rewards catalog items for administrative management.
   */
  getRewards(query?: RewardQuery): Observable<Page<AdminRewardItem>> {
    return this.apiClient.getPaged<AdminRewardItem>(API_ENDPOINTS.reward.list, query);
  }

  /**
   * Retrieves active reward categories for catalog filtering and item assignment.
   */
  getCategories(): Observable<RewardCategoryItem[]> {
    return this.apiClient.get<RewardCategoryItem[]>(API_ENDPOINTS.reward.categories);
  }

  /**
   * Creates a new reward item in the catalog.
   */
  createReward(req: CreateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.post<AdminRewardItem>(API_ENDPOINTS.reward.create, req);
  }

  /**
   * Updates an existing reward catalog item.
   */
  updateReward(rewardId: Id, req: UpdateRewardRequest): Observable<AdminRewardItem> {
    return this.apiClient.put<AdminRewardItem>(
      API_ENDPOINTS.reward.update(rewardId),
      req
    );
  }

  /**
   * Archives a reward item, taking it out of circulation.
   */
  archiveReward(rewardId: Id): Observable<ArchiveRewardResponse> {
    return this.apiClient.post<ArchiveRewardResponse>(
      API_ENDPOINTS.reward.archive(rewardId),
      {}
    );
  }

  /**
   * Uploads reward voucher image asset.
   */
  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const context = new HttpContext().set(REQUEST_TIMEOUT, 120_000);
    return this.apiClient.post<{ imageUrl: string }>(
      API_ENDPOINTS.reward.uploadImage,
      formData,
      { context }
    );
  }
}
