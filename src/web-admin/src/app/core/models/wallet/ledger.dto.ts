import { Id } from '../common/id.model';
import { LedgerEntryType } from './ledger-entry-type.enum';

/**
 * Request payload for POST /api/v1/admin/ledger/adjustments (APIs.md 5.4).
 */
export interface ManualAdjustmentRequest {
  userId: Id;
  amount: number;
  type: LedgerEntryType;
  reasonCode: string;
  reasonNote: string;
}

/**
 * Response data for POST /api/v1/admin/ledger/adjustments (APIs.md 5.4).
 */
export interface ManualAdjustmentResponse {
  transactionId: Id;
  userId: Id;
  pointsDelta: number;
  balanceAfter: number;
}
