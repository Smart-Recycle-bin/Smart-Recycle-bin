// GAP: see gap_api.md → Wallet & Global Ledger (UI p8)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { LedgerEntryType } from './ledger-entry-type.enum';
import { LedgerSource } from './ledger-source.enum';

/**
 * Filter query parameters for the global ledger (UI p8).
 */
export interface LedgerQuery extends PageQuery {
  userId?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
  type?: LedgerEntryType;
  source?: LedgerSource;
  search?: string;
}

/**
 * Enriched financial ledger transaction row (UI p8).
 */
export interface LedgerRow {
  transactionId: Id;
  timestamp: string; // ISO 8601 string
  userId: Id;
  userName: string;
  binId?: Id | null;
  detailText: string;
  pointsDelta: number;
  runningBalance: number;
  entryType: LedgerEntryType;
  source: LedgerSource;
  isManualAdjustment: boolean;
}
