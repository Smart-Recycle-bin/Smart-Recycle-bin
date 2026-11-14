import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockBackendInterceptor, resetSharedMockRouter } from './mock-backend.interceptor';
import { resetMockDb, getMockDb } from '../../../mock/db/mock-db';
import { generateMockAccessToken } from './mock-auth';
import { UserRole } from '../../../models/user/user-role.enum';
import { ApiErrorCode } from '../../../models/common/api-error-code.enum';
import { AccountStatus } from '../../../models/user/account-status.enum';
import { AuditActionType } from '../../../models/audit/audit-action-type.enum';
import { ApiResponse } from '../../../models/common/api-response.dto';
import { LoginResponse } from '../../../models/auth/auth.dto';
import { BinListItem } from '../../../models/bin/bin.view-model';

import { SuspendUserResponse } from '../../../models/user/user.dto';

describe('mockBackendInterceptor', () => {
  let http: HttpClient;

  beforeEach(() => {
    resetMockDb();
    resetSharedMockRouter();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
      ],
    });

    http = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    resetMockDb();
    resetSharedMockRouter();
  });

  it('authenticates valid admin login and issues tokens', async () => {
    const res = await new Promise<ApiResponse<LoginResponse>>((resolve, reject) => {
      http
        .post<ApiResponse<LoginResponse>>('/api/v1/auth/login', {
          email: 'admin@ecobin.eg',
          password: 'password123',
        })
        .subscribe({ next: resolve, error: reject });
    });

    expect(res.success).toBe(true);
    expect(res.data.accessToken).toMatch(/^mock_jwt\./);
    expect(res.data.refreshToken).toMatch(/^mock_rt_/);
    expect(res.data.user.role).toBe(UserRole.Admin);

    const db = getMockDb();
    expect(db.refreshTokens.length).toBe(1);
    expect(db.refreshTokens[0]?.token).toBe(res.data.refreshToken);
  });

  it('rejects invalid login credentials with 401 INVALID_CREDENTIALS', async () => {
    try {
      await new Promise((resolve, reject) => {
        http
          .post('/api/v1/auth/login', {
            email: 'admin@ecobin.eg',
            password: 'WrongPassword',
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect.unreachable('Should fail with 401');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpErrorResponse);
      const httpErr = err as HttpErrorResponse;
      expect(httpErr.status).toBe(401);
      expect((httpErr.error as { error: { code: string } }).error.code).toBe(
        ApiErrorCode.InvalidCredentials
      );
    }
  });

  it('requires SysAdmin auth token on admin routes', async () => {
    try {
      await new Promise((resolve, reject) => {
        http.get('/api/v1/admin/bins').subscribe({ next: resolve, error: reject });
      });
      expect.unreachable('Should fail with 401');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpErrorResponse);
      const httpErr = err as HttpErrorResponse;
      expect(httpErr.status).toBe(401);
    }
  });

  it('returns bins list when authenticated as Admin', async () => {
    const token = generateMockAccessToken(
      { userId: 'ADM-001', role: UserRole.Admin, displayName: 'Sarah Connor' },
      900
    );

    const res = await new Promise<ApiResponse<BinListItem[]>>((resolve, reject) => {
      http
        .get<ApiResponse<BinListItem[]>>('/api/v1/admin/bins', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({ next: resolve, error: reject });
    });

    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(23);
  });

  it('rotates refresh token and detects reuse to revoke family', async () => {
    // 1. Initial Login
    const loginRes = await new Promise<ApiResponse<LoginResponse>>((resolve, reject) => {
      http
        .post<ApiResponse<LoginResponse>>('/api/v1/auth/login', {
          email: 'admin@ecobin.eg',
          password: 'password123',
        })
        .subscribe({ next: resolve, error: reject });
    });

    const rt1 = loginRes.data.refreshToken;

    // 2. Legitimate Refresh
    const refreshRes1 = await new Promise<ApiResponse<LoginResponse>>((resolve, reject) => {
      http
        .post<ApiResponse<LoginResponse>>('/api/v1/auth/refresh', { refreshToken: rt1 })
        .subscribe({ next: resolve, error: reject });
    });

    expect(refreshRes1.success).toBe(true);
    const rt2 = refreshRes1.data.refreshToken;
    expect(rt2).not.toBe(rt1);

    // 3. Attacker attempts to reuse rt1
    try {
      await new Promise((resolve, reject) => {
        http
          .post('/api/v1/auth/refresh', { refreshToken: rt1 })
          .subscribe({ next: resolve, error: reject });
      });
      expect.unreachable('Should fail with 401 reuse detection');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpErrorResponse);
      const httpErr = err as HttpErrorResponse;
      expect(httpErr.status).toBe(401);
      expect((httpErr.error as { error: { code: string } }).error.code).toBe(
        ApiErrorCode.InvalidRefreshToken
      );
    }

    // 4. Verify rt2 has also been revoked as part of the family
    const db = getMockDb();
    const rt2Record = db.refreshTokens.find((r) => r.token === rt2);
    expect(rt2Record?.revokedAt).not.toBeNull();
  });

  it('appends audit log on mutating actions like user suspension', async () => {
    const token = generateMockAccessToken(
      { userId: 'ADM-001', role: UserRole.Admin, displayName: 'Sarah Connor' },
      900
    );

    const initialAuditCount = getMockDb().auditLogs.length;

    const res = await new Promise<ApiResponse<SuspendUserResponse>>(
      (resolve, reject) => {
        http
          .post<ApiResponse<SuspendUserResponse>>(
            '/api/v1/admin/users/U-10021/suspend',
            { reason: 'Multiple anomalies reported' },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .subscribe({ next: resolve, error: reject });
      }
    );

    expect(res.success).toBe(true);
    expect(res.data.accountStatus).toBe(AccountStatus.Suspended);

    const db = getMockDb();
    expect(db.auditLogs.length).toBe(initialAuditCount + 1);
    expect(db.auditLogs[0]?.actionType).toBe(AuditActionType.UserSuspension);
    expect(db.auditLogs[0]?.resourceId).toBe('U-10021');
  });

  it('returns 404 for unknown mock route', async () => {
    try {
      await new Promise((resolve, reject) => {
        http.get('/api/v1/non-existent-route').subscribe({ next: resolve, error: reject });
      });
      expect.unreachable('Should fail with 404');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpErrorResponse);
      const httpErr = err as HttpErrorResponse;
      expect(httpErr.status).toBe(404);
      expect((httpErr.error as { error: { code: string } }).error.code).toBe(
        ApiErrorCode.NotFound
      );
    }
  });
});
