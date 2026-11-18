import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorCode } from '@models/common/api-error-code.enum';

export type ExtendedApiErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN';

/**
 * Normalized application API error representing both server-side errors and client network failures.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ExtendedApiErrorCode;
  readonly details?: unknown;
  readonly requestUrl: string;

  constructor(params: {
    status: number;
    code: ExtendedApiErrorCode;
    message: string;
    details?: unknown;
    requestUrl: string;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.requestUrl = params.requestUrl;

    // Restore prototype chain in ES5/ES6 environments
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Constructs an ApiError instance from an Angular HttpErrorResponse.
   */
  static fromHttpError(error: HttpErrorResponse, requestUrl: string): ApiError {
    const errorBody = error.error as Record<string, unknown> | null;

    let code: ExtendedApiErrorCode = 'UNKNOWN';
    let message = error.message;
    let details: unknown;

    if (error.status === 0) {
      code = 'NETWORK_ERROR';
      message = 'Network connection failure. Please verify your internet connection.';
    } else if (errorBody && typeof errorBody === 'object') {
      // Support both { error: { code, message } } and { code, message } envelopes
      const nestedError = errorBody['error'] as Record<string, unknown> | undefined;

      const rawCode =
        (nestedError && typeof nestedError['code'] === 'string' ? nestedError['code'] : undefined) ??
        (typeof errorBody['code'] === 'string' ? errorBody['code'] : undefined);

      if (rawCode) {
        code = rawCode as ExtendedApiErrorCode;
      }

      const rawMessage =
        (nestedError && typeof nestedError['message'] === 'string'
          ? nestedError['message']
          : undefined) ??
        (typeof errorBody['message'] === 'string' ? errorBody['message'] : undefined);

      if (rawMessage) {
        message = rawMessage;
      }

      details = nestedError?.['details'] ?? errorBody['details'];
    }

    return new ApiError({
      status: error.status,
      code,
      message,
      details,
      requestUrl,
    });
  }
}
