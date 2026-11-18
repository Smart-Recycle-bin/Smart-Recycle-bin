import { AuthUser } from '@models/auth/auth.dto';
import { RecyclerListItem } from '@models/user/recycler.view-model';
import { CollectorListItem } from '@models/collector/collector.view-model';
import { BinListItem } from '@models/bin/bin.view-model';
import {
  InspectionReportListItem,
  InspectionReportDetail,
  InspectionSummary,
  WasteTypeOption,
} from '@models/inspection/inspection.view-model';
import { SurveyQaSummary, RecentSurveyRow } from '@models/survey/survey.view-model';
import { LedgerRow } from '@models/wallet/ledger.view-model';
import { AdminRewardItem } from '@models/reward/reward.view-model';
import { LeaderboardRow, MilestoneBadge } from '@models/gamification/gamification.view-model';
import { NotificationItem } from '@models/notification/notification.view-model';
import { AuditLogRow } from '@models/audit/audit.view-model';
import { DashboardOverview } from '@models/analytics/analytics.view-model';

/**
 * Mock administrator credentials record for mock auth validation.
 * Mock-internal type; NOT exported from core/models.
 */
export interface MockAdminAccount {
  user: AuthUser;
  email: string;
  password: string;
  initials: string;
}

/**
 * Mock stored refresh token entity with rotation & family tracking.
 * Mock-internal type; NOT exported from core/models.
 */
export interface MockRefreshToken {
  token: string;
  userId: string;
  familyId: string;
  expiresAt: string; // ISO 8601 string
  usedAt: string | null;
  revokedAt: string | null;
}

/**
 * Complete state tree for the mutable mock in-memory database.
 */
export interface MockDb {
  admins: MockAdminAccount[];
  recyclers: RecyclerListItem[];
  collectors: CollectorListItem[];
  bins: BinListItem[];
  inspectionReports: InspectionReportListItem[];
  inspectionDetails: Record<string, InspectionReportDetail>;
  inspectionSummary: InspectionSummary;
  wasteTypes: WasteTypeOption[];
  surveyQa: SurveyQaSummary;
  recentSurveys: RecentSurveyRow[];
  ledger: LedgerRow[];
  rewards: AdminRewardItem[];
  leaderboards: {
    weekly: LeaderboardRow[];
    monthly: LeaderboardRow[];
    allTime: LeaderboardRow[];
  };
  badges: MilestoneBadge[];
  notifications: NotificationItem[];
  auditLogs: AuditLogRow[];
  analytics: {
    today: DashboardOverview;
    sevenDays: DashboardOverview;
    thirtyDays: DashboardOverview;
  };
  refreshTokens: MockRefreshToken[];
}
