import { Id } from '../common/id.model';
import { InspectionReportStatus } from './inspection-report-status.enum';

/**
 * Request payload for correcting waste category on an inspection report (E68).
 */
export interface CorrectCategoryRequest {
  wasteTypeId: Id;
  adminJustification: string;
}

/**
 * Request payload for dismissing an inspection report (E69).
 */
export interface DismissInspectionReportRequest {
  adminJustification: string;
}

/**
 * Response payload for an administrative resolution or retraining queue action (E68-E70).
 */
export interface InspectionActionResponse {
  reportId: Id;
  status: InspectionReportStatus;
  reviewDecision?: string;
  confirmedWasteType?: string;
  pointsCredited?: number;
  transactionId?: number | null;
  retrainingStatus?: string;
  message: string;
  resolvedAt: string; // ISO 8601 string
}
