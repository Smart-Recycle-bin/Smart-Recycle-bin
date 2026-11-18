// GAP: see gap_api.md → Survey QA Quality Analytics (UI p11)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { SurveyOutcome } from './survey-outcome.enum';

/**
 * Filter query parameters for the Survey QA page (UI p11).
 */
export interface SurveyQaQuery extends PageQuery {
  period?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}


/**
 * Top-level KPI card values and period deltas (UI p11).
 */
export interface SurveyQaKpiSummary {
  totalSurveys: number;
  confirmRate: number;
  confirmRateDeltaPp: number;
  rejectRate: number;
  rejectRateDeltaPp: number;
  flaggedToAiQueue: number;
}

/**
 * Daily rejection rate trend point for time-series charts (UI p11).
 */
export interface RejectionRateTrendPoint {
  date: string;
  rejectionRate: number;
}

/**
 * Rejection rate metric per smart bin (UI p11).
 */
export interface BinRejectionRate {
  binId: Id;
  rejectionRate: number;
}

/**
 * Rejection rate metric per waste material category (UI p11).
 */
export interface WasteCategoryRejectionRate {
  category: string;
  rejectionRate: number;
}

/**
 * Recent post-disposal survey outcome item (UI p11).
 */
export interface RecentSurveyRow {
  sessionId: Id;
  userName: string;
  itemsSummary: string;
  points: number;
  result: SurveyOutcome;
}

/**
 * Complete aggregated payload for the Survey QA screen (UI p11).
 */
export interface SurveyQaSummary {
  kpis: SurveyQaKpiSummary;
  confirmCount: number;
  rejectCount: number;
  rejectionTrend: RejectionRateTrendPoint[];
  highestRejectionBins: BinRejectionRate[];
  rejectionByCategory: WasteCategoryRejectionRate[];
  recentSurveys: RecentSurveyRow[];
}
