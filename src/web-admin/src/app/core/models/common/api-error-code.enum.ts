export const ApiErrorCode = {
  AccountSuspended: 'ACCOUNT_SUSPENDED',
  BinNotFound: 'BIN_NOT_FOUND',
  Conflict: 'CONFLICT',
  DeviceAlreadyRegistered: 'DEVICE_ALREADY_REGISTERED',
  EmailAlreadyExists: 'EMAIL_ALREADY_EXISTS',
  Forbidden: 'FORBIDDEN',
  InsufficientBalance: 'INSUFFICIENT_BALANCE',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  NotFound: 'NOT_FOUND',
  Unauthorized: 'UNAUTHORIZED',
  ValidationError: 'VALIDATION_ERROR',

  // PROPOSED refresh-token flow error code (gap_api.md Section 1.1)
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const API_ERROR_CODE_LABELS: Record<ApiErrorCode, string> = {
  [ApiErrorCode.AccountSuspended]: 'Account suspended',
  [ApiErrorCode.BinNotFound]: 'Bin not found',
  [ApiErrorCode.Conflict]: 'Resource conflict',
  [ApiErrorCode.DeviceAlreadyRegistered]: 'Device already registered',
  [ApiErrorCode.EmailAlreadyExists]: 'Email address already exists',
  [ApiErrorCode.Forbidden]: 'Access forbidden',
  [ApiErrorCode.InsufficientBalance]: 'Insufficient available points',
  [ApiErrorCode.InvalidCredentials]: 'Invalid credentials',
  [ApiErrorCode.NotFound]: 'Resource not found',
  [ApiErrorCode.Unauthorized]: 'Authentication required',
  [ApiErrorCode.ValidationError]: 'Validation failed',
  [ApiErrorCode.InvalidRefreshToken]: 'Invalid or revoked refresh token',
};
