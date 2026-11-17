import { IconName } from '../../shared/components/icon/icon';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: IconName | string;
  route: string;
  exact?: boolean;
  badge?: string | number;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [
      { id: 'overview', label: 'Overview', icon: 'dashboard', route: '/overview', exact: true },
    ],
  },
  {
    title: 'Fleet Management',
    items: [
      { id: 'bins', label: 'Bins List', icon: 'recycle', route: '/bins', exact: true },
      { id: 'bins-map', label: 'Live Bin Map', icon: 'map', route: '/bins/map' },
    ],
  },
  {
    title: 'Users & Moderation',
    items: [
      { id: 'recyclers', label: 'Recyclers', icon: 'users', route: '/recyclers' },
      { id: 'collectors', label: 'Collectors', icon: 'user', route: '/collectors' },
    ],
  },
  {
    items: [
      { id: 'wallet', label: 'Wallet & Ledger', icon: 'wallet', route: '/wallet' },
      { id: 'review-queue', label: 'Reports', icon: 'file-text', route: '/review-queue' },
      { id: 'survey-qa', label: 'Survey QA', icon: 'clipboard-check', route: '/survey-qa' },
      { id: 'rewards', label: 'Rewards Catalog', icon: 'gift', route: '/rewards' },
      { id: 'leaderboards', label: 'Leaderboards & Badges', icon: 'trophy', route: '/leaderboards' },
      { id: 'audit-logs', label: 'Audit Logs', icon: 'shield', route: '/audit-logs' },
    ],
  },
];
