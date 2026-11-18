import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './api-error';
import { ApiErrorCode } from '@models/common/api-error-code.enum';

/**
 * Extracts a human-readable error message from an unknown error value.
 * Handles ApiError, HttpErrorResponse, JavaScript Error, error-like objects, strings, and fallbacks.
 */
export function getErrorMessage(
  err: unknown,
  fallback = 'An unexpected error occurred. Please try again.'
): string {
  if (!err) {
    return fallback;
  }

  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }

  if (err instanceof ApiError) {
    return err.message || fallback;
  }

  if (err instanceof HttpErrorResponse) {
    const errorBody = err.error as Record<string, unknown> | null;
    if (errorBody && typeof errorBody === 'object') {
      const nested = errorBody['error'] as Record<string, unknown> | undefined;
      const nestedMsg = nested && typeof nested['message'] === 'string' ? nested['message'] : undefined;
      const directMsg = typeof errorBody['message'] === 'string' ? errorBody['message'] : undefined;
      if (nestedMsg && nestedMsg.trim().length > 0) {
        return nestedMsg;
      }
      if (directMsg && directMsg.trim().length > 0) {
        return directMsg;
      }
    }
    return err.message || fallback;
  }

  if (err instanceof Error) {
    return err.message || fallback;
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj['message'] === 'string' && obj['message'].trim().length > 0) {
      return obj['message'];
    }
  }

  return fallback;
}

/**
 * Checks whether an error carries a specific API error code.
 */
export function isApiErrorCode(err: unknown, code: ApiErrorCode): boolean {
  if (!err) {
    return false;
  }

  if (err instanceof ApiError) {
    return err.code === code;
  }

  if (err instanceof HttpErrorResponse) {
    const errorBody = err.error as Record<string, unknown> | null;
    if (errorBody && typeof errorBody === 'object') {
      const nested = errorBody['error'] as Record<string, unknown> | undefined;
      const nestedCode = nested && typeof nested['code'] === 'string' ? nested['code'] : undefined;
      const directCode = typeof errorBody['code'] === 'string' ? errorBody['code'] : undefined;
      return nestedCode === code || directCode === code;
    }
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (obj['code'] === code) {
      return true;
    }
    const nested = obj['error'] as Record<string, unknown> | undefined;
    if (nested && nested['code'] === code) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts field-level validation errors from an API error response (PROPOSED, gap_api.md).
 * Reads `error.details` as `{ field: string, message: string }[]` and returns a key-value dictionary.
 */
export function getFieldErrors(err: unknown): Record<string, string> | null {
  if (!err) {
    return null;
  }

  let details: unknown;
  if (err instanceof ApiError) {
    details = err.details;
  } else if (err instanceof HttpErrorResponse) {
    const errorBody = err.error as Record<string, unknown> | null;
    if (errorBody && typeof errorBody === 'object') {
      const nested = errorBody['error'] as Record<string, unknown> | undefined;
      details = nested?.['details'] ?? errorBody['details'];
    }
  } else if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const nested = obj['error'] as Record<string, unknown> | undefined;
    details = obj['details'] ?? nested?.['details'];
  }

  if (Array.isArray(details) && details.length > 0) {
    const result: Record<string, string> = {};
    for (const item of details) {
      if (item && typeof item === 'object') {
        const field = (item as Record<string, unknown>)['field'];
        const message = (item as Record<string, unknown>)['message'];
        if (typeof field === 'string' && typeof message === 'string') {
          result[field] = message;
        }
      }
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  return null;
}

