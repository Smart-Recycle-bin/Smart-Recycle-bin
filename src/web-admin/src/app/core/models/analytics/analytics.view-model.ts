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
  value: number | null;
  deltaPercent?: number | null; // e.g. +4.2 (%)
  deltaPp?: number | null;      // percentage points e.g. +0.6 pp
  trendPositive?: boolean | null;
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
 * Material share breakdown item for donut chart (item-count based when weight is not tracked).
 */
export interface MaterialVolumeShare {
  material: string;
  percentage: number;
  itemCount?: number;
  tonnage?: number | null;
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
  confidence: number | null;
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

  totalRecycledTonnage: number | null;
  totalDisposalItems?: number;
  materialShares: MaterialVolumeShare[];
  recyclingVolumeByType?: Record<string, number>;

  contaminationTrend: MetricTrendPoint[];
  dauTrend: MetricTrendPoint[] | null;

  urgentBins: BinNeedingAttentionItem[];
  urgentReviews: PendingAiReviewItem[];
  topContaminationHotspots: ContaminationHotspot[];
}
