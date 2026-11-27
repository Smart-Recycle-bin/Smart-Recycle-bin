import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import {
  InspectionReportDetail,
  InspectionReportListItem,
  InspectionReportQuery,
  InspectionSummary,
  WasteTypeOption,
} from '@models/inspection/inspection.view-model';
import { Id } from '@models/common/id.model';
import { Page } from '@models/common/page.model';
import {
  CorrectCategoryRequest,
  DismissInspectionReportRequest,
  InspectionActionResponse,
} from '@models/inspection/inspection.dto';

@Injectable({
  providedIn: 'root',
})
export class InspectionReportsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves summary metrics for retraining dataset and queue counters (PROPOSED, gap_api.md 1.6).
   */
  getSummary(): Observable<InspectionSummary> {
    return this.apiClient.get<InspectionSummary>(API_ENDPOINTS.inspection.summary);
  }

  /**
   * Retrieves list of inspection reports flagged for manual review (PROPOSED, gap_api.md 1.6).
   */
  getReports(query?: InspectionReportQuery): Observable<Page<InspectionReportListItem>> {
    return this.apiClient.getPaged<InspectionReportListItem>(API_ENDPOINTS.inspection.list, query);
  }

  /**
   * Retrieves detailed inspection report including captured frames (PROPOSED, gap_api.md 1.6).
   */
  getReportDetail(reportId: Id): Observable<InspectionReportDetail> {
    return this.apiClient.get<InspectionReportDetail>(API_ENDPOINTS.inspection.detail(reportId));
  }

  /**
   * Sets correct category for an inspection report (PROPOSED, gap_api.md 1.6).
   */
  correctCategory(
    reportId: Id,
    req: CorrectCategoryRequest
  ): Observable<InspectionActionResponse> {
    return this.apiClient.post<InspectionActionResponse>(
      API_ENDPOINTS.inspection.correct(reportId),
      req
    );
  }

  /**
   * Confirms ML inference was correct and dismisses dispute with required justification (E69).
   */
  dismissReport(
    reportId: Id,
    req: DismissInspectionReportRequest
  ): Observable<InspectionActionResponse> {
    return this.apiClient.post<InspectionActionResponse>(
      API_ENDPOINTS.inspection.dismiss(reportId),
      req
    );
  }

  /**
   * Records a resolved report in the local retraining queue with no request body (E70).
   */
  sendToRetraining(reportId: Id): Observable<InspectionActionResponse> {
    return this.apiClient.post<InspectionActionResponse>(
      API_ENDPOINTS.inspection.retrain(reportId),
      {}
    );
  }

  /**
   * Retrieves list of available waste material categories for reclassification (PROPOSED, gap_api.md 1.6).
   */
  getWasteTypeOptions(): Observable<WasteTypeOption[]> {
    return this.apiClient.get<WasteTypeOption[]>(API_ENDPOINTS.inspection.wasteTypes);
  }
}
