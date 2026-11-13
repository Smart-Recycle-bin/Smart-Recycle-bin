import { Id } from '../common/id.model';
import { UserRole } from '../user/user-role.enum';

/**
 * Authenticated user profile returned in login responses.
 */
export interface AuthUser {
  userId: Id;
  displayName: string;
  role: UserRole;
}

/**
 * Request payload for POST /api/v1/auth/login (APIs.md 2.2).
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Response data for POST /api/v1/auth/login (APIs.md 2.2).
 * Note: refreshToken is PROPOSED (see docs/frontend-scope.md Section 7).
 */
export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Request payload for POST /api/v1/auth/forgot-password (APIs.md 2.4).
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Request payload for POST /api/v1/auth/refresh (PROPOSED, frontend-scope.md Section 7).
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Response data for POST /api/v1/auth/refresh (PROPOSED, frontend-scope.md Section 7).
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

/**
 * Request payload for POST /api/v1/auth/logout (APIs.md 2.3 + frontend-scope.md Section 7).
 */
export interface LogoutRequest {
  refreshToken?: string;
}

/**
 * Client-side session representation managed by TokenStorageService.
 */
export interface StoredSession {
  accessToken: string;
  expiresAt: string; // ISO 8601 string
  refreshToken: string | null;
  user: AuthUser;
}
