import { Id } from '../common/id.model';
import { AccountStatus } from './account-status.enum';
import { UserRole } from './user-role.enum';

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
  status: AccountStatus | string;
  reason?: string;
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
  status: AccountStatus | string;
  reason?: string;
  unsuspendedAt: string; // ISO 8601 string
}

