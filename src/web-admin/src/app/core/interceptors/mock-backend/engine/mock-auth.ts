import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { UserRole } from '@models/user/user-role.enum';

export interface MockTokenPayload {
  userId: string;
  role: string;
  displayName: string;
  exp: number; // Unix timestamp in seconds
}

export interface MockAuthResult {
  authenticated: boolean;
  user?: MockTokenPayload;
  errorResponse?: HttpErrorResponse;
}

export function generateMockAccessToken(
  user: { userId: string; role: string; displayName?: string },
  ttlSeconds: number
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: MockTokenPayload = {
    userId: user.userId,
    role: user.role,
    displayName: user.displayName ?? '',
    exp,
  };

  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `mock_jwt.${encodedPayload}.mock_sig`;
}

export function generateMockRefreshToken(): string {
  return `mock_rt_${Math.random().toString(36).substring(2)}_${Date.now().toString(36)}`;
}

export function parseMockToken(token: string): {
  valid: boolean;
  payload?: MockTokenPayload;
  expired?: boolean;
  error?: string;
} {
  if (!token || !token.startsWith('mock_jwt.')) {
    return { valid: false, error: 'Invalid mock token format' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token segments' };
  }

  try {
    const base64 = (parts[1] ?? '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr) as MockTokenPayload;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      return { valid: false, expired: true, error: 'Token has expired', payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Failed to decode token payload' };
  }
}

export function extractBearerToken(req: HttpRequest<unknown>): string | null {
  if (!req.headers || typeof req.headers.get !== 'function') {
    return null;
  }
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? (match[1] ?? null) : null;
}

export function authenticateMockRequest(
  req: HttpRequest<unknown>,
  requireAdmin = false
): MockAuthResult {
  const token = extractBearerToken(req);

  if (!token) {
    return {
      authenticated: false,
      errorResponse: new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: req.url,
        error: {
          success: false,
          error: {
            code: ApiErrorCode.Unauthorized,
            message: 'Missing or malformed Authorization header',
          },
        },
      }),
    };
  }

  const parsed = parseMockToken(token);
  if (!parsed.valid || !parsed.payload) {
    return {
      authenticated: false,
      errorResponse: new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: req.url,
        error: {
          success: false,
          error: {
            code: ApiErrorCode.Unauthorized,
            message: parsed.error ?? 'Invalid access token',
          },
        },
      }),
    };
  }

  const user = parsed.payload;

  if (requireAdmin && user.role !== UserRole.Admin) {
    return {
      authenticated: false,
      user,
      errorResponse: new HttpErrorResponse({
        status: 403,
        statusText: 'Forbidden',
        url: req.url,
        error: {
          success: false,
          error: {
            code: ApiErrorCode.Forbidden,
            message: 'Administrator privileges required',
          },
        },
      }),
    };
  }

  return {
    authenticated: true,
    user,
  };
}
