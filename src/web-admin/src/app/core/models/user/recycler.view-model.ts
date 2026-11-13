// GAP: see gap_api.md → Recyclers Moderation List (UI p5)
import { Id } from '../common/id.model';
import { AccountStatus } from './account-status.enum';

/**
 * Filter query parameters for the recyclers moderation screen (UI p5).
 */
export interface RecyclerQuery {
  search?: string;
  status?: AccountStatus;
}

/**
 * Recycler account row displayed in the moderation table (UI p5).
 */
export interface RecyclerListItem {
  userId: Id;
  name: string;
  initials: string;
  email: string;
  availablePoints: number;
  lifetimePoints: number;
  sessions: number;
  status: AccountStatus;
  joined: string; // ISO date string
}
