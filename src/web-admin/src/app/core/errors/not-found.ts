import { ApiErrorCode } from '@models/common/api-error-code.enum';

/**
 * Checks if an error represents an HTTP 404 or NOT_FOUND application error.
 */
export function isNotFoundError(err: unknown): boolean {
  if (!err) return false;
  if ((err as { status?: number }).status === 404) return true;
  const code = (err as { code?: string }).code;
  if (code === ApiErrorCode.NotFound || code === 'NOT_FOUND') return true;
  return false;
}
