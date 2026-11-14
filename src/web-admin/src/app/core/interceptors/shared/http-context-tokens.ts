import { HttpContextToken } from '@angular/common/http';

/**
 * Token to bypass authorization header insertion (used e.g. for login and refresh endpoints).
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Token to bypass global error handler toast/logging notifications.
 */
export const SKIP_ERROR_HANDLING = new HttpContextToken<boolean>(() => false);
