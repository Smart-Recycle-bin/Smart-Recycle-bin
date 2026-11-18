import { describe, it, expect } from 'vitest';
import { HttpHeaders, HttpRequest } from '@angular/common/http';
import {
  generateMockAccessToken,
  generateMockRefreshToken,
  parseMockToken,
  authenticateMockRequest,
} from './mock-auth';
import { UserRole } from '@models/user/user-role.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';

describe('mock-auth', () => {
  it('generates a valid mock access token with expected payload', () => {
    const token = generateMockAccessToken(
      { userId: 'USR-123', role: UserRole.Admin, displayName: 'Alice' },
      900
    );

    expect(token).toMatch(/^mock_jwt\.[A-Za-z0-9_-]+\.mock_sig$/);

    const parsed = parseMockToken(token);
    expect(parsed.valid).toBe(true);
    expect(parsed.payload?.userId).toBe('USR-123');
    expect(parsed.payload?.role).toBe(UserRole.Admin);
    expect(parsed.payload?.displayName).toBe('Alice');
    expect(parsed.expired).toBeUndefined();
  });

  it('generates a unique mock refresh token', () => {
    const rt1 = generateMockRefreshToken();
    const rt2 = generateMockRefreshToken();

    expect(rt1).toMatch(/^mock_rt_[a-z0-9_]+$/);
    expect(rt2).toMatch(/^mock_rt_[a-z0-9_]+$/);
    expect(rt1).not.toBe(rt2);
  });

  it('detects an expired mock token', () => {
    // Generate token that expired 10 seconds ago
    const expiredToken = generateMockAccessToken(
      { userId: 'USR-OLD', role: UserRole.Citizen },
      -10
    );

    const parsed = parseMockToken(expiredToken);
    expect(parsed.valid).toBe(false);
    expect(parsed.expired).toBe(true);
    expect(parsed.error).toBe('Token has expired');
  });

  it('rejects an invalid token format', () => {
    const parsed1 = parseMockToken('random_string');
    expect(parsed1.valid).toBe(false);

    const parsed2 = parseMockToken('mock_jwt.invalid-base64.sig');
    expect(parsed2.valid).toBe(false);
  });

  it('authenticates request with valid Bearer token', () => {
    const token = generateMockAccessToken(
      { userId: 'ADM-01', role: UserRole.Admin },
      600
    );
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const req = new HttpRequest('GET', '/api/v1/admin/bins', null, { headers });

    const result = authenticateMockRequest(req, true);
    expect(result.authenticated).toBe(true);
    expect(result.user?.userId).toBe('ADM-01');
    expect(result.errorResponse).toBeUndefined();
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = new HttpRequest('GET', '/api/v1/admin/bins');
    const result = authenticateMockRequest(req);

    expect(result.authenticated).toBe(false);
    expect(result.errorResponse?.status).toBe(401);
    expect((result.errorResponse?.error as { error: { code: string } }).error.code).toBe(
      ApiErrorCode.Unauthorized
    );
  });

  it('returns 403 when non-admin user attempts admin route', () => {
    const token = generateMockAccessToken(
      { userId: 'CIT-01', role: UserRole.Citizen },
      600
    );
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    const req = new HttpRequest('GET', '/api/v1/admin/bins', null, { headers });

    const result = authenticateMockRequest(req, true);
    expect(result.authenticated).toBe(false);
    expect(result.errorResponse?.status).toBe(403);
    expect((result.errorResponse?.error as { error: { code: string } }).error.code).toBe(
      ApiErrorCode.Forbidden
    );
  });
});
