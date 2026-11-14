import { MockDb } from './mock-db.types';
import {
  MOCK_ADMINS,
  MOCK_RECYCLERS,
  MOCK_COLLECTORS,
  MOCK_BINS,
  MOCK_INSPECTION_REPORTS,
  MOCK_INSPECTION_DETAILS,
  MOCK_INSPECTION_SUMMARY,
  MOCK_WASTE_TYPE_OPTIONS,
  MOCK_SURVEY_QA_SUMMARY,
  MOCK_RECENT_SURVEYS,
  MOCK_LEDGER_ROWS,
  MOCK_REWARDS,
  MOCK_LEADERBOARD_WEEKLY,
  MOCK_LEADERBOARD_MONTHLY,
  MOCK_LEADERBOARD_ALL_TIME,
  MOCK_MILESTONE_BADGES,
  MOCK_NOTIFICATIONS,
  MOCK_AUDIT_LOGS,
  MOCK_OVERVIEW_TODAY,
  MOCK_OVERVIEW_7D,
  MOCK_OVERVIEW_30D,
} from '../data';

/**
 * Creates a fresh deep-cloned instance of the mock in-memory database.
 */
export function createMockDb(): MockDb {
  return {
    admins: structuredClone(MOCK_ADMINS),
    recyclers: structuredClone(MOCK_RECYCLERS),
    collectors: structuredClone(MOCK_COLLECTORS),
    bins: structuredClone(MOCK_BINS),
    inspectionReports: structuredClone(MOCK_INSPECTION_REPORTS),
    inspectionDetails: structuredClone(MOCK_INSPECTION_DETAILS),
    inspectionSummary: structuredClone(MOCK_INSPECTION_SUMMARY),
    wasteTypes: structuredClone(MOCK_WASTE_TYPE_OPTIONS),
    surveyQa: structuredClone(MOCK_SURVEY_QA_SUMMARY),
    recentSurveys: structuredClone(MOCK_RECENT_SURVEYS),
    ledger: structuredClone(MOCK_LEDGER_ROWS),
    rewards: structuredClone(MOCK_REWARDS),
    leaderboards: {
      weekly: structuredClone(MOCK_LEADERBOARD_WEEKLY),
      monthly: structuredClone(MOCK_LEADERBOARD_MONTHLY),
      allTime: structuredClone(MOCK_LEADERBOARD_ALL_TIME),
    },
    badges: structuredClone(MOCK_MILESTONE_BADGES),
    notifications: structuredClone(MOCK_NOTIFICATIONS),
    auditLogs: structuredClone(MOCK_AUDIT_LOGS),
    analytics: {
      today: structuredClone(MOCK_OVERVIEW_TODAY),
      sevenDays: structuredClone(MOCK_OVERVIEW_7D),
      thirtyDays: structuredClone(MOCK_OVERVIEW_30D),
    },
    refreshTokens: [],
  };
}

let activeDbInstance: MockDb | null = null;

/**
 * Returns the singleton instance of the mutable in-memory mock database.
 */
export function getMockDb(): MockDb {
  if (!activeDbInstance) {
    activeDbInstance = createMockDb();
  }
  return activeDbInstance;
}

/**
 * Resets the in-memory mock database back to its initial seed state, clearing refreshTokens.
 */
export function resetMockDb(): MockDb {
  activeDbInstance = createMockDb();
  return activeDbInstance;
}
