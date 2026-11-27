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
  outcome?: SurveyOutcome;
}


/**
 * Top-level KPI card values and period deltas (UI p11).
 */
export interface SurveyQaKpiSummary {
  totalSurveys: number;
  confirmedCount?: number;
  rejectedCount?: number;
  confirmRate: number;
  confirmRateDeltaPp: number | null;
  rejectRate: number;
  rejectRateDeltaPp: number | null;
  flaggedToAiQueue: number;
  averageAiRating: number | null;
}

/**
 * Daily rejection rate trend point for time-series charts (UI p11).
 */
export interface RejectionRateTrendPoint {
  date: string;
  rejectionRate: number;
  totalCount?: number;
  rejectedCount?: number;
}

/**
 * Rejection rate metric per smart bin (UI p11).
 */
export interface BinRejectionRate {
  binId: Id;
  binName?: string | null;
  rejectionRate: number;
  rejectedCount?: number;
  totalCount?: number;
}

/**
 * Rejection rate metric per waste material category (UI p11).
 */
export interface WasteCategoryRejectionRate {
  category: string;
  rejectionRate: number;
  rejectedCount?: number;
  totalCount?: number;
}

/**
 * Recent post-disposal survey outcome item (UI p11).
 */
export interface RecentSurveyRow {
  surveyId?: Id;
  sessionId: Id;
  userId?: Id;
  userName: string;
  itemsSummary: string;
  points: number;
  pointsAwarded?: number;
  result: SurveyOutcome;
  outcome?: SurveyOutcome;
  timestamp?: string;
}

/**
 * Complete aggregated payload for the Survey QA screen (UI p11).
 */
export interface SurveyQaSummary {
  kpis: SurveyQaKpiSummary;
  confirmCount: number;
  rejectCount: number;
  split?: {
    confirmed: number;
    rejected: number;
  };
  rejectionTrend: RejectionRateTrendPoint[];
  highestRejectionBins: BinRejectionRate[];
  rejectionByCategory: WasteCategoryRejectionRate[];
  recentSurveys?: RecentSurveyRow[];
}
