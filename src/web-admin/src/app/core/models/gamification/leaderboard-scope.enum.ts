export const LeaderboardScope = {
  Weekly: 'weekly',
  Monthly: 'monthly',
  AllTime: 'all-time',
} as const;

export type LeaderboardScope = (typeof LeaderboardScope)[keyof typeof LeaderboardScope];

export const LEADERBOARD_SCOPE_LABELS: Record<LeaderboardScope, string> = {
  [LeaderboardScope.Weekly]: 'Weekly',
  [LeaderboardScope.Monthly]: 'Monthly',
  [LeaderboardScope.AllTime]: 'All-time',
};
