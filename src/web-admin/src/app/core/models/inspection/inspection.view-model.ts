// GAP: see gap_api.md → Inspection Reports Queue & Review (UI p9, p10)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { InspectionReportStatus } from './inspection-report-status.enum';

/**
 * Filter query parameters for the inspection reports queue (UI p9).
 */
export interface InspectionReportQuery extends PageQuery {
  status?: InspectionReportStatus;
  search?: string;
}

/**
 * Inspection report row item displayed in the review queue table (UI p9).
 */
export interface InspectionReportListItem {
  reportId: Id;
  airId: string; // e.g. 'AIR-2048'
  sessionId: Id;
  binId: Id;
  imageThumbnailUrl: string;
  mlPredictedWasteType: string;
  mlConfidence: number; // 0.0 to 1.0 (e.g. 0.62)
  userFeedback: string;
  date: string; // ISO 8601 string
  status: InspectionReportStatus;
}

/**
 * Detailed inspection report view with captured frames and inference confidence (UI p10).
 */
export interface InspectionReportDetail {
  reportId: Id;
  airId: string;
  sessionId: Id;
  binId: Id;
  userName: string;
  date: string; // ISO 8601 string
  status: InspectionReportStatus;
  capturedFrames: string[];
  userFeedback: string;
  mlModelVersion: string;
  predictedWasteType: string;
  estimatedPoints: number;
  classConfidences: Record<string, number>;
}

/**
 * Dataset retraining widget metrics displayed above the inspection queue (UI p9).
 */
export interface InspectionSummary {
  labelledImagesCount: number;
  targetImagesThreshold: number;
  remainingUntilRetrain: number;
  pendingReviewCount: number;
  reviewedCount: number;
}

/**
 * Waste material category option for the admin correction dropdown (UI p10).
 */
export interface WasteTypeOption {
  wasteTypeId: Id;
  name: string;
  description?: string;
}
