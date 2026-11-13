import { Id } from '../common/id.model';
import { InspectionReportStatus } from './inspection-report-status.enum';

/**
 * Request payload for correcting waste category on an inspection report (PROPOSED, gap_api.md Section 1.9).
 */
export interface CorrectCategoryRequest {
  wasteTypeId: Id;
  adminJustification?: string;
}

/**
 * Response payload for an administrative resolution on an inspection report (PROPOSED, gap_api.md Section 1.9).
 */
export interface InspectionActionResponse {
  reportId: Id;
  status: InspectionReportStatus;
  message: string;
  resolvedAt: string; // ISO 8601 string
}
