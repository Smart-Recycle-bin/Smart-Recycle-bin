import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  LeaderboardQuery,
  LeaderboardRow,
  MilestoneBadge,
} from '@models/gamification/gamification.view-model';
import { Page } from '@models/common/page.model';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves user leaderboard rankings for the specified scope (APIs.md 5.5).
   */
  getLeaderboard(query?: LeaderboardQuery): Observable<Page<LeaderboardRow>> {
    return this.apiClient.getPaged<LeaderboardRow>(API_ENDPOINTS.gamification.leaderboard, query);
  }

  /**
   * Retrieves milestone badges catalogue and earned statistics (PROPOSED, gap_api.md 1.10).
   */
  getMilestoneBadges(): Observable<MilestoneBadge[]> {
    return this.apiClient.get<MilestoneBadge[]>(API_ENDPOINTS.gamification.badges);
  }
}
