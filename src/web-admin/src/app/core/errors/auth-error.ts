export type AuthErrorCode = 'NOT_ADMIN' | 'SESSION_EXPIRED' | 'UNAUTHENTICATED';

/**
 * Strongly-typed error representing authentication or role authorization rejections.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
