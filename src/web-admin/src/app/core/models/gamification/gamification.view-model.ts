// GAP: see gap_api.md → Leaderboard & Milestone Badges (UI p15)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { LeaderboardScope } from './leaderboard-scope.enum';

/**
 * Filter query parameters for the gamification leaderboard (UI p15).
 */
export interface LeaderboardQuery extends PageQuery {
  scope?: LeaderboardScope;
}

/**
 * Ranked user row item displayed on the leaderboard table (UI p15).
 */
export interface LeaderboardRow {
  rank: number;
  userId: Id;
  displayName: string;
  initials: string;
  lifetimePoints: number;
  recyclingVolumeKg: number;
}

/**
 * Platform milestone achievement badge item (UI p15).
 */
export interface MilestoneBadge {
  badgeId: Id;
  name: string;
  requiredPoints: number;
  description: string;
  earnedCount: number;
  icon: string;
}
