import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  RecentSurveyRow,
  SurveyQaQuery,
  SurveyQaSummary,
} from '@models/survey/survey.view-model';
import { Page } from '@models/common/page.model';

@Injectable({
  providedIn: 'root',
})
export class SurveyQaService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves aggregated Survey QA metrics, trends, and breakdowns (PROPOSED, gap_api.md 1.7).
   */
  getQaSummary(query?: SurveyQaQuery): Observable<SurveyQaSummary> {
    return this.apiClient.get<SurveyQaSummary>(API_ENDPOINTS.survey.qa, {
      params: query as Record<string, unknown>,
    });
  }

  /**
   * Retrieves recent post-disposal survey outcome rows (PROPOSED, gap_api.md 1.7).
   */
  getRecentSurveys(query?: SurveyQaQuery): Observable<Page<RecentSurveyRow>> {
    return this.apiClient.getPaged<RecentSurveyRow>(API_ENDPOINTS.survey.recent, query);
  }
}
