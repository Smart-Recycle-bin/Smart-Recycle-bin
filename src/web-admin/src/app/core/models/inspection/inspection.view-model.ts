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
  airId?: string | null;
  sessionId: Id;
  binId: Id;
  binName?: string | null;
  imageThumbnailUrl: string | null;
  mlPredictedWasteType: string;
  mlConfidence: number | null; // 0.0 to 1.0 or null if unavailable
  userSelectedWasteType?: string | null;
  userFeedback: string;
  date: string; // ISO 8601 string
  status: InspectionReportStatus;
}

/**
 * Detailed inspection report view with captured frames and inference confidence (UI p10).
 */
export interface InspectionReportDetail {
  reportId: Id;
  airId?: string | null;
  sessionId: Id;
  binId: Id;
  binName?: string | null;
  userName: string;
  date: string; // ISO 8601 string
  status: InspectionReportStatus;
  capturedFrames: string[];
  userFeedback: string;
  userSelectedWasteType?: string | null;
  aiRating?: number | null;
  mlModelVersion?: string | null;
  predictedWasteType: string;
  predictedConfidence?: number | null;
  estimatedPoints: number;
  classConfidences?: Record<string, number> | null;
  reviewDecision?: string | null;
  confirmedWasteType?: string | null;
  adminJustification?: string | null;
  reviewedAt?: string | null;
  retrainingStatus?: string | null;
}

/**
 * Dataset retraining widget metrics displayed above the inspection queue (UI p9).
 */
export interface InspectionSummary {
  labelledImagesCount: number | null;
  targetImagesThreshold: number | null;
  remainingUntilRetrain: number | null;
  pendingReviewCount: number;
  reviewedCount: number;
  sentToRetrainingCount?: number;
}

/**
 * Waste material category option for the admin correction dropdown (UI p10).
 */
export interface WasteTypeOption {
  wasteTypeId: Id;
  name: string;
  description?: string;
  basePoints?: number;
}
