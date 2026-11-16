import { HttpContextToken } from '@angular/common/http';

/**
 * Token to bypass authorization header insertion (used e.g. for login, refresh, and public endpoints).
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Token to bypass global error handler toast/logging notifications.
 */
export const SKIP_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);

/**
 * Token to mark requests that have already been retried once after 401 token refresh.
 * Prevents infinite retry loops.
 */
export const RETRIED = new HttpContextToken<boolean>(() => false);

/**
 * Request timeout in milliseconds (defaults to 30,000 ms, or 120,000 ms for file uploads).
 */
export const REQUEST_TIMEOUT = new HttpContextToken<number>(() => 30_000);
