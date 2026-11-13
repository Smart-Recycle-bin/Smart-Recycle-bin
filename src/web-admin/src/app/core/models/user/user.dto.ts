import { Id } from '../common/id.model';
import { AccountStatus } from './account-status.enum';

/**
 * Request payload for POST /api/v1/admin/users/{userId}/suspend (APIs.md 2.13).
 */
export interface SuspendUserRequest {
  reason: string;
}

/**
 * Response data for POST /api/v1/admin/users/{userId}/suspend (APIs.md 2.13).
 */
export interface SuspendUserResponse {
  userId: Id;
  accountStatus: AccountStatus;
  suspendedAt: string; // ISO 8601 string
}

/**
 * Request payload for POST /api/v1/admin/users/{userId}/unsuspend (APIs.md 2.14).
 */
export interface UnsuspendUserRequest {
  reason?: string;
}

/**
 * Response data for POST /api/v1/admin/users/{userId}/unsuspend (APIs.md 2.14).
 */
export interface UnsuspendUserResponse {
  userId: Id;
  accountStatus: AccountStatus;
  unsuspendedAt: string; // ISO 8601 string
}
