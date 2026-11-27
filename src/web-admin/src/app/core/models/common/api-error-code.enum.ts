export const ApiErrorCode = {
  AccountInactive: 'ACCOUNT_INACTIVE',
  AccountSuspended: 'ACCOUNT_SUSPENDED',
  BinNotFound: 'BIN_NOT_FOUND',
  Conflict: 'CONFLICT',
  DeviceAlreadyRegistered: 'DEVICE_ALREADY_REGISTERED',
  EmailAlreadyExists: 'EMAIL_ALREADY_EXISTS',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  Forbidden: 'FORBIDDEN',
  IdempotencyKeyReused: 'IDEMPOTENCY_KEY_REUSED',
  InsufficientBalance: 'INSUFFICIENT_BALANCE',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  NotFound: 'NOT_FOUND',
  Unauthorized: 'UNAUTHORIZED',
  UserRoleNotFound: 'USER_ROLE_NOT_FOUND',
  ValidationError: 'VALIDATION_ERROR',

  // PROPOSED refresh-token flow error code (gap_api.md Section 1.1)
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export const API_ERROR_CODE_LABELS: Record<ApiErrorCode, string> = {
  [ApiErrorCode.AccountInactive]: 'Account inactive',
  [ApiErrorCode.AccountSuspended]: 'Account suspended',
  [ApiErrorCode.BinNotFound]: 'Bin not found',
  [ApiErrorCode.Conflict]: 'Resource conflict',
  [ApiErrorCode.DeviceAlreadyRegistered]: 'Device already registered',
  [ApiErrorCode.EmailAlreadyExists]: 'Email address already exists',
  [ApiErrorCode.EmailNotVerified]: 'Email not verified',
  [ApiErrorCode.Forbidden]: 'Access forbidden',
  [ApiErrorCode.IdempotencyKeyReused]: 'Idempotency key reused with a different payload',
  [ApiErrorCode.InsufficientBalance]: 'Insufficient available points',
  [ApiErrorCode.InvalidCredentials]: 'Invalid credentials',
  [ApiErrorCode.NotFound]: 'Resource not found',
  [ApiErrorCode.Unauthorized]: 'Authentication required',
  [ApiErrorCode.UserRoleNotFound]: 'User role not assigned',
  [ApiErrorCode.ValidationError]: 'Validation failed',
  [ApiErrorCode.InvalidRefreshToken]: 'Invalid or revoked refresh token',
};
