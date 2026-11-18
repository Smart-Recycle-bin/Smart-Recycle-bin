import { TableColumn } from '@shared/components/table/data-table/data-table';
import { LeaderboardRow } from '@models/gamification/gamification.view-model';
import {
  LeaderboardScope,
  LEADERBOARD_SCOPE_LABELS,
} from '@models/gamification/leaderboard-scope.enum';
import { TabItem } from '@shared/components/tabs/tabs';

export const LEADERBOARD_TABS: TabItem[] = [
  { id: LeaderboardScope.Weekly, label: LEADERBOARD_SCOPE_LABELS[LeaderboardScope.Weekly] },
  { id: LeaderboardScope.Monthly, label: LEADERBOARD_SCOPE_LABELS[LeaderboardScope.Monthly] },
  { id: LeaderboardScope.AllTime, label: LEADERBOARD_SCOPE_LABELS[LeaderboardScope.AllTime] },
];

export const LEADERBOARD_TABLE_COLUMNS: TableColumn<LeaderboardRow>[] = [
  {
    key: 'rank',
    label: 'Rank',
    sortable: true,
    width: '80px',
    align: 'center',
  },
  {
    key: 'displayName',
    label: 'User',
    sortable: true,
  },
  {
    key: 'lifetimePoints',
    label: 'Lifetime points',
    align: 'right',
    sortable: true,
    width: '150px',
  },
  {
    key: 'recyclingVolumeKg',
    label: 'Recycling volume',
    align: 'right',
    sortable: true,
    width: '150px',
  },
];

export function getRankBadgeClass(rank: number): string {
  switch (rank) {
    case 1:
      return 'rank-gold';
    case 2:
      return 'rank-silver';
    case 3:
      return 'rank-bronze';
    default:
      return 'rank-neutral';
  }
}
