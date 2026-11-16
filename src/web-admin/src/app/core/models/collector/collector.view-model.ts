// GAP: see gap_api.md → Collectors List & Actions (UI p6, p7)
import { BinStatus } from '../bin/bin-status.enum';
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { AccountStatus } from '../user/account-status.enum';

/**
 * Filter query parameters for the collectors table (UI p6).
 */
export interface CollectorQuery extends PageQuery {
  search?: string;
  district?: string;
  status?: AccountStatus;
}

/**
 * Collector row displayed in the field collectors table (UI p6).
 */
export interface CollectorListItem {
  collectorId: Id;
  name: string;
  initials: string;
  district: string;
  email: string;
  phone: string;
  assignedBinsCount: number;
  status: AccountStatus;
  lastActiveAt: string; // ISO 8601 string or formatted string
}

/**
 * Smart bin assigned to a collector, displayed in the assigned-bins modal (UI p6).
 */
export interface CollectorAssignedBin {
  binId: Id;
  name: string;
  area: string;
  district: string;
  fillLevel: number;
  status: BinStatus;
  lastServicedAt: string; // ISO 8601 string
}
