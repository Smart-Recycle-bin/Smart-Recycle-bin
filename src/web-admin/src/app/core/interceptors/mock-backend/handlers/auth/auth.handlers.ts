import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { generateMockAccessToken, generateMockRefreshToken } from '@core/interceptors/mock-backend/engine/mock-auth';
import { environment } from '@env/environment';
import { LoginRequest, LoginResponse, RefreshTokenRequest } from '@models/auth/auth.dto';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse } from '../handler-utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function registerAuthHandlers(router: MockRouter): void {
  // 1. Login
  router.post<LoginRequest>('/api/v1/auth/login', (ctx) => {
    const { email, password } = (ctx.req.body as LoginRequest) || {};
    if (!email || !password) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Email and password are required');
    }

    if (!EMAIL_REGEX.test(email)) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Invalid email format');
    }

    const db = getMockDb();
    const adminAccount = db.admins.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
    );

    if (!adminAccount) {
      return errorResponse(
        401,
        ApiErrorCode.InvalidCredentials,
        'Invalid email or password'
      );
    }

    const ttlSeconds = environment.mockAccessTokenTtlSeconds || 900;
    const refreshTtlDays = environment.mockRefreshTokenTtlDays || 7;
    const accessToken = generateMockAccessToken(adminAccount.user, ttlSeconds);
    const refreshToken = generateMockRefreshToken();
    const familyId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 3600 * 1000).toISOString();

    db.refreshTokens.push({
      token: refreshToken,
      userId: adminAccount.user.userId,
      familyId,
      expiresAt,
      usedAt: null,
      revokedAt: null,
    });

    const response: LoginResponse = {
      accessToken,
      expiresIn: ttlSeconds,
      refreshToken,
      user: adminAccount.user,
    };

    return okResponse(response);
  });

  // 2. Refresh Token with Rotation & Reuse Detection
  router.post<RefreshTokenRequest>('/api/v1/auth/refresh', (ctx) => {
    const { refreshToken } = (ctx.req.body as RefreshTokenRequest) || {};
    if (!refreshToken) {
      return errorResponse(
        400,
        ApiErrorCode.ValidationError,
        'Refresh token is required'
      );
    }

    const db = getMockDb();
    const record = db.refreshTokens.find((r) => r.token === refreshToken);

    if (!record) {
      return errorResponse(
        401,
        ApiErrorCode.InvalidRefreshToken,
        'Invalid refresh token'
      );
    }

    // Reuse detection: token was already consumed!
    if (record.usedAt !== null) {
      // Invalidate the entire token family
      const nowIso = new Date().toISOString();
      for (const rt of db.refreshTokens) {
        if (rt.familyId === record.familyId) {
          rt.revokedAt = nowIso;
        }
      }
      return errorResponse(
        401,
        ApiErrorCode.InvalidRefreshToken,
        'Refresh token reuse detected. Family revoked.'
      );
    }

    // Token revoked
    if (record.revokedAt !== null) {
      return errorResponse(
        401,
        ApiErrorCode.InvalidRefreshToken,
        'Refresh token has been revoked'
      );
    }

    // Token expired
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return errorResponse(
        401,
        ApiErrorCode.InvalidRefreshToken,
        'Refresh token has expired'
      );
    }

    // Mark as used
    record.usedAt = new Date().toISOString();

    const adminAccount = db.admins.find((a) => a.user.userId === record.userId);
    if (!adminAccount) {
      return errorResponse(401, ApiErrorCode.Unauthorized, 'User account not found');
    }

    const ttlSeconds = environment.mockAccessTokenTtlSeconds || 900;
    const refreshTtlDays = environment.mockRefreshTokenTtlDays || 7;
    const newAccessToken = generateMockAccessToken(adminAccount.user, ttlSeconds);
    const newRefreshToken = generateMockRefreshToken();
    const newExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 3600 * 1000).toISOString();

    db.refreshTokens.push({
      token: newRefreshToken,
      userId: adminAccount.user.userId,
      familyId: record.familyId,
      expiresAt: newExpiresAt,
      usedAt: null,
      revokedAt: null,
    });

    const response: LoginResponse = {
      accessToken: newAccessToken,
      expiresIn: ttlSeconds,
      refreshToken: newRefreshToken,
      user: adminAccount.user,
    };

    return okResponse(response);
  });

  // 3. Logout
  router.post<{ refreshToken?: string }>('/api/v1/auth/logout', (ctx) => {
    const db = getMockDb();
    const body = ctx.req.body as { refreshToken?: string } | null;
    if (body?.refreshToken) {
      const record = db.refreshTokens.find((r) => r.token === body.refreshToken);
      if (record) {
        record.revokedAt = new Date().toISOString();
      }
    }
    return okResponse({ message: 'Logged out successfully' });
  });

  // 4. Forgot Password
  router.post<{ email: string }>('/api/v1/auth/forgot-password', () => {
    return okResponse({ message: 'Password reset link sent if account exists' });
  });
}
