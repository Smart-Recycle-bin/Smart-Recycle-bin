// GAP: see gap_api.md → Operational Overview Analytics (UI p2, p17)
import { BinStatus } from '../bin/bin-status.enum';
import { Id } from '../common/id.model';
import { AnalyticsPeriod } from './analytics-period.enum';

/**
 * Filter query parameters for the Operational Overview dashboard (UI p2).
 */
export interface OverviewQuery {
  period?: AnalyticsPeriod;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

/**
 * Top KPI card with value and period-over-period delta (UI p2, p17).
 */
export interface OverviewKpiCard {
  value: number;
  deltaPercent?: number; // e.g. +4.2 (%)
  deltaPp?: number;      // percentage points e.g. +0.6 pp
  trendPositive?: boolean;
}

/**
 * Daily points issued vs redeemed time-series point (UI p2, p17).
 */
export interface PointsTimeSeriesPoint {
  date: string;
  issued: number;
  redeemed: number;
}

/**
 * Fleet health breakdown counts across availability states (UI p17).
 */
export interface FleetHealthBreakdown {
  totalBins: number;
  available: number;
  eightyPercentFull: number;
  needsServicing: number;
  offline: number;
}

/**
 * Material tonnage share breakdown item for donut chart (UI p17).
 */
export interface MaterialVolumeShare {
  material: string;
  percentage: number;
  tonnage?: number;
}

/**
 * Contamination or DAU trend data point for sparklines (UI p17).
 */
export interface MetricTrendPoint {
  date: string;
  value: number;
}

/**
 * Critical bin needing servicing (fill ≥ 95%) in needs-attention list (UI p17).
 */
export interface BinNeedingAttentionItem {
  binId: Id;
  name: string;
  area: string;
  fillLevel: number;
  status: BinStatus;
}

/**
 * Unreviewed AI report requiring moderation in needs-attention list (UI p17).
 */
export interface PendingAiReviewItem {
  reportId: Id;
  predictedType: string;
  confidence: number;
  feedback: string;
}

/**
 * Material category contamination hotspot item (UI p17).
 */
export interface ContaminationHotspot {
  category: string;
  rejectionRate: number;
}

/**
 * Complete Operational Overview dashboard payload (UI p2, p17).
 */
export interface DashboardOverview {
  dailyActiveUsers: OverviewKpiCard;
  pointsIssued: OverviewKpiCard;
  pointsRedeemed: OverviewKpiCard;
  contaminationRate: OverviewKpiCard;
  binsNeedingServiceCount: number;
  pendingAiReviewsCount: number;

  pointsComparisonSeries: PointsTimeSeriesPoint[];
  fleetHealth: FleetHealthBreakdown;

  totalRecycledTonnage: number;
  materialShares: MaterialVolumeShare[];

  contaminationTrend: MetricTrendPoint[];
  dauTrend: MetricTrendPoint[];

  urgentBins: BinNeedingAttentionItem[];
  urgentReviews: PendingAiReviewItem[];
  topContaminationHotspots: ContaminationHotspot[];
}
