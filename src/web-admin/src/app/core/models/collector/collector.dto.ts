import { Id } from '../common/id.model';
import { AccountStatus } from '../user/account-status.enum';
import { UserRole } from '../user/user-role.enum';
import { CollectorCredentialsMode } from './collector-credentials-mode.enum';

/**
 * Request payload for POST /api/v1/admin/collectors (APIs.md 2.7 + enriched per UI p7).
 */
export interface CreateCollectorRequest {
  email: string;
  password?: string;
  displayName: string;
  phoneNumber: string;
  credentialsMode?: CollectorCredentialsMode;
  district?: string;
}

/**
 * Response data for POST /api/v1/admin/collectors (APIs.md 2.7).
 */
export interface CreateCollectorResponse {
  userId: Id;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string; // ISO 8601 string
}

/**
 * Request payload for editing an existing collector (PROPOSED, gap_api.md Section 1.5).
 */
export interface UpdateCollectorRequest {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  district?: string;
}

/**
 * Response data for deactivating a collector account (PROPOSED, gap_api.md Section 1.5).
 */
export interface DeactivateCollectorResponse {
  collectorId: Id;
  status: AccountStatus;
  deactivatedAt: string; // ISO 8601 string
}
