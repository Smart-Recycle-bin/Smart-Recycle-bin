import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { DashboardOverview, OverviewQuery } from '@models/analytics/analytics.view-model';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves operational overview dashboard metrics, trends, and attention queues (APIs.md 7.9).
   */
  getOverview(query?: OverviewQuery): Observable<DashboardOverview> {
    return this.apiClient.get<DashboardOverview>(API_ENDPOINTS.analytics.overview, {
      params: query as Record<string, unknown>,
    });
  }
}
