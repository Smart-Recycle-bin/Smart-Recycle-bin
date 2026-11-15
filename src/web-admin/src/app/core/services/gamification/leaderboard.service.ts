import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  LeaderboardQuery,
  LeaderboardRow,
  MilestoneBadge,
} from '../../models/gamification/gamification.view-model';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves user leaderboard rankings for the specified scope (APIs.md 5.5).
   */
  getLeaderboard(query?: LeaderboardQuery): Observable<LeaderboardRow[]> {
    return this.apiClient.get<LeaderboardRow[]>(API_ENDPOINTS.gamification.leaderboard, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Retrieves milestone badges catalogue and earned statistics (PROPOSED, gap_api.md 1.10).
   */
  getMilestoneBadges(): Observable<MilestoneBadge[]> {
    return this.apiClient.get<MilestoneBadge[]>(API_ENDPOINTS.gamification.badges);
  }
}
