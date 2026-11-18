import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { RecyclerListItem, RecyclerQuery } from '@models/user/recycler.view-model';
import { Page } from '@models/common/page.model';
import {
  SuspendUserRequest,
  SuspendUserResponse,
  UnsuspendUserRequest,
  UnsuspendUserResponse,
} from '@models/user/user.dto';

@Injectable({
  providedIn: 'root',
})
export class RecyclersService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves list of recycler accounts for admin moderation (APIs.md 2.11 / gap_api.md 1.4).
   */
  getRecyclers(query?: RecyclerQuery): Observable<Page<RecyclerListItem>> {
    const { search, ...rest } = query ?? {};
    const params: Record<string, unknown> = {
      role: 'USER_CITIZEN',
      ...rest,
    };
    if (search) {
      params['query'] = search;
    }

    return this.apiClient.getPaged<RecyclerListItem>(API_ENDPOINTS.user.recyclers, params);
  }

  /**
   * Suspends a recycler account with justification (APIs.md 2.13).
   */
  suspendRecycler(userId: string, reason: string): Observable<SuspendUserResponse> {
    const payload: SuspendUserRequest = { reason };
    return this.apiClient.post<SuspendUserResponse>(API_ENDPOINTS.user.suspend(userId), payload);
  }

  /**
   * Restores a previously suspended recycler account (APIs.md 2.14).
   */
  unsuspendRecycler(userId: string): Observable<UnsuspendUserResponse> {
    const payload: UnsuspendUserRequest = {};
    return this.apiClient.post<UnsuspendUserResponse>(API_ENDPOINTS.user.unsuspend(userId), payload);
  }
}
