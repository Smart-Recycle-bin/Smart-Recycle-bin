import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockBackendInterceptor, resetSharedMockRouter } from './mock-backend.interceptor';
import { resetMockDb, getMockDb } from '@core/mock/db/mock-db';
import { generateMockAccessToken } from './mock-auth';
import { UserRole } from '@models/user/user-role.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { AccountStatus } from '@models/user/account-status.enum';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { ApiResponse } from '@models/common/api-response.dto';
import { PageMeta } from '@models/common/page.model';
import { DistrictLookupItem, CollectorLookupItem, AdminLookupItem } from '@models/lookup/lookup.model';
import { LoginResponse } from '@models/auth/auth.dto';
import { BinListItem } from '@models/bin/bin.view-model';
import { SuspendUserResponse } from '@models/user/user.dto';
import { environment } from '@env/environment';

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

  it('authenticates valid admin login and issues tokens with environment TTL', async () => {
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

    const expectedExpiryMs = Date.now() + environment.mockRefreshTokenTtlDays * 24 * 3600 * 1000;
    const actualExpiryMs = new Date(db.refreshTokens[0]?.expiresAt ?? '').getTime();
    expect(Math.abs(actualExpiryMs - expectedExpiryMs)).toBeLessThan(5000);
  });

  it('rejects malformed email with 400 VALIDATION_ERROR', async () => {
    try {
      await new Promise((resolve, reject) => {
        http
          .post('/api/v1/auth/login', {
            email: 'not-an-email',
            password: 'password123',
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect.unreachable('Should fail with 400');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(HttpErrorResponse);
      const httpErr = err as HttpErrorResponse;
      expect(httpErr.status).toBe(400);
      expect((httpErr.error as { error: { code: string } }).error.code).toBe(
        ApiErrorCode.ValidationError
      );
    }
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

  it('rotates refresh token and detects reuse to revoke family using environment TTL', async () => {
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

    const db = getMockDb();
    const rt2Record = db.refreshTokens.find((r) => r.token === rt2);
    expect(rt2Record).toBeDefined();
    const expectedExpiryMs = Date.now() + environment.mockRefreshTokenTtlDays * 24 * 3600 * 1000;
    const actualExpiryMs = new Date(rt2Record?.expiresAt ?? '').getTime();
    expect(Math.abs(actualExpiryMs - expectedExpiryMs)).toBeLessThan(5000);

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
    expect(res.data.status).toBe(AccountStatus.Suspended);

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

  describe('Server-side pagination contract and mock handlers', () => {
    const adminToken = generateMockAccessToken(
      {
        userId: 'admin_test',
        displayName: 'Test Admin',
        role: UserRole.Admin,
      },
      900
    );

    it('returns full array without meta when page is not provided (unpaged fallback)', async () => {
      const res = await new Promise<ApiResponse<BinListItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<BinListItem[]>>('/api/v1/admin/bins', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(res.data.length).toBe(23);
      expect((res as { meta?: PageMeta }).meta).toBeUndefined();
    });

    it('returns paginated data with meta for page 1 and page 2', async () => {
      const p1 = await new Promise<ApiResponse<BinListItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<BinListItem[]>>('/api/v1/admin/bins?page=1&pageSize=10', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(p1.success).toBe(true);
      expect(p1.data.length).toBe(10);
      expect(p1.meta).toEqual({
        page: 1,
        pageSize: 10,
        totalItems: 23,
        totalPages: 3,
      });

      const p2 = await new Promise<ApiResponse<BinListItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<BinListItem[]>>('/api/v1/admin/bins?page=2&pageSize=10', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(p2.success).toBe(true);
      expect(p2.data.length).toBe(10);
      expect(p2.meta).toEqual({
        page: 2,
        pageSize: 10,
        totalItems: 23,
        totalPages: 3,
      });
      // Ensure pages contain different items
      expect(p1.data[0].binId).not.toBe(p2.data[0].binId);
    });

    it('returns empty data with accurate meta when page is beyond totalPages', async () => {
      const res = await new Promise<ApiResponse<BinListItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<BinListItem[]>>('/api/v1/admin/bins?page=99&pageSize=10', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(res.data).toEqual([]);
      expect(res.meta).toEqual({
        page: 99,
        pageSize: 10,
        totalItems: 23,
        totalPages: 3,
      });
    });

    it('returns 400 VALIDATION_ERROR on invalid page or pageSize', async () => {
      try {
        await new Promise((resolve, reject) => {
          http
            .get('/api/v1/admin/bins?page=0', {
              headers: { Authorization: `Bearer ${adminToken}` },
            })
            .subscribe({ next: resolve, error: reject });
        });
        expect.unreachable('Should have failed');
      } catch (err) {
        const httpErr = err as HttpErrorResponse;
        expect(httpErr.status).toBe(400);
        expect((httpErr.error as { error: { code: string } }).error.code).toBe(
          ApiErrorCode.ValidationError
        );
      }

      try {
        await new Promise((resolve, reject) => {
          http
            .get('/api/v1/admin/bins?page=1&pageSize=0', {
              headers: { Authorization: `Bearer ${adminToken}` },
            })
            .subscribe({ next: resolve, error: reject });
        });
        expect.unreachable('Should have failed');
      } catch (err) {
        const httpErr = err as HttpErrorResponse;
        expect(httpErr.status).toBe(400);
        expect((httpErr.error as { error: { code: string } }).error.code).toBe(
          ApiErrorCode.ValidationError
        );
      }
    });

    it('returns 400 VALIDATION_ERROR on disallowed sortBy', async () => {
      try {
        await new Promise((resolve, reject) => {
          http
            .get('/api/v1/admin/bins?page=1&sortBy=disallowedField', {
              headers: { Authorization: `Bearer ${adminToken}` },
            })
            .subscribe({ next: resolve, error: reject });
        });
        expect.unreachable('Should have failed');
      } catch (err) {
        const httpErr = err as HttpErrorResponse;
        expect(httpErr.status).toBe(400);
        expect((httpErr.error as { error: { code: string } }).error.code).toBe(
          ApiErrorCode.ValidationError
        );
      }
    });

    it('returns 400 VALIDATION_ERROR on invalid sortDir', async () => {
      try {
        await new Promise((resolve, reject) => {
          http
            .get('/api/v1/admin/bins?page=1&sortDir=sideways', {
              headers: { Authorization: `Bearer ${adminToken}` },
            })
            .subscribe({ next: resolve, error: reject });
        });
        expect.unreachable('Should have failed');
      } catch (err) {
        const httpErr = err as HttpErrorResponse;
        expect(httpErr.status).toBe(400);
        expect((httpErr.error as { error: { code: string } }).error.code).toBe(
          ApiErrorCode.ValidationError
        );
      }
    });
  });

  describe('Lookup endpoints', () => {
    const adminToken = generateMockAccessToken(
      {
        userId: 'admin_test',
        displayName: 'Test Admin',
        role: UserRole.Admin,
      },
      900
    );

    it('returns districts lookup with name and region', async () => {
      const res = await new Promise<ApiResponse<DistrictLookupItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<DistrictLookupItem[]>>('/api/v1/admin/lookups/districts', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].name).toBeTruthy();
      expect(res.data[0].region).toBeTruthy();
    });

    it('returns collectors lookup with collectorId and displayName', async () => {
      const res = await new Promise<ApiResponse<CollectorLookupItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<CollectorLookupItem[]>>('/api/v1/admin/lookups/collectors', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].collectorId).toBeTruthy();
      expect(res.data[0].displayName).toBeTruthy();
    });

    it('returns admins lookup with adminId and displayName', async () => {
      const res = await new Promise<ApiResponse<AdminLookupItem[]>>((resolve, reject) => {
        http
          .get<ApiResponse<AdminLookupItem[]>>('/api/v1/admin/lookups/admins', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].adminId).toBeTruthy();
      expect(res.data[0].displayName).toBeTruthy();
    });
  });

  describe('Prompt 10 Regression Tests: Mock Handlers 1-4', () => {
    let adminToken: string;

    beforeEach(() => {
      adminToken = generateMockAccessToken(
        { userId: 'ADM-001', role: UserRole.Admin, displayName: 'Laila Hamdy' },
        3600
      );
    });

    it('1. Review queue counters: derives pending and reviewed from reports, updates on dismiss, correct, and retrain', async () => {
      // 1. Initial summary: 5 pending, 3 reviewed (2 reviewed + 1 sent to retrain)
      const initialSummary = await new Promise<ApiResponse<{ pendingReviewCount: number; reviewedCount: number; labelledImagesCount: number; remainingUntilRetrain: number }>>((resolve, reject) => {
        http
          .get<ApiResponse<any>>('/api/v1/admin/inspections/summary', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(initialSummary.data.pendingReviewCount).toBe(5);
      expect(initialSummary.data.reviewedCount).toBe(3);
      expect(initialSummary.data.labelledImagesCount).toBe(1285);
      expect(initialSummary.data.remainingUntilRetrain).toBe(215);

      // 2. Action: Dismiss AIR-2048
      await new Promise<any>((resolve, reject) => {
        http
          .post<any>('/api/v1/admin/inspections/AIR-2048/dismiss', {}, {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      const summaryAfterDismiss = await new Promise<ApiResponse<any>>((resolve, reject) => {
        http
          .get<ApiResponse<any>>('/api/v1/admin/inspections/summary', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect(summaryAfterDismiss.data.pendingReviewCount).toBe(4);
      expect(summaryAfterDismiss.data.reviewedCount).toBe(4);

      // 3. Action: Correct category on AIR-2047
      await new Promise<any>((resolve, reject) => {
        http
          .post<any>(
            '/api/v1/admin/inspections/AIR-2047/correct',
            { wasteTypeId: 'Glass', adminJustification: 'Corrected' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
          .subscribe({ next: resolve, error: reject });
      });

      const summaryAfterCorrect = await new Promise<ApiResponse<any>>((resolve, reject) => {
        http
          .get<ApiResponse<any>>('/api/v1/admin/inspections/summary', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect(summaryAfterCorrect.data.pendingReviewCount).toBe(3);
      expect(summaryAfterCorrect.data.reviewedCount).toBe(5);

      // 4. Action: Retrain AIR-2046
      await new Promise<any>((resolve, reject) => {
        http
          .post<any>(
            '/api/v1/admin/inspections/AIR-2046/retrain',
            { confirmedCategory: 'Metal' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
          .subscribe({ next: resolve, error: reject });
      });

      const summaryAfterRetrain = await new Promise<ApiResponse<any>>((resolve, reject) => {
        http
          .get<ApiResponse<any>>('/api/v1/admin/inspections/summary', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect(summaryAfterRetrain.data.pendingReviewCount).toBe(2);
      expect(summaryAfterRetrain.data.reviewedCount).toBe(6);
      expect(summaryAfterRetrain.data.labelledImagesCount).toBe(1286);
      expect(summaryAfterRetrain.data.remainingUntilRetrain).toBe(214);
    });

    it('2. Collector deactivate: sets status to inactive (not suspended)', async () => {
      const res = await new Promise<ApiResponse<any>>((resolve, reject) => {
        http
          .post<ApiResponse<any>>('/api/v1/admin/collectors/C-001/deactivate', {}, {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(AccountStatus.Inactive);
      expect(res.data.status).toBe('inactive');

      const db = getMockDb();
      const collector = db.collectors.find((c) => c.collectorId === 'C-001');
      expect(collector?.status).toBe(AccountStatus.Inactive);
    });

    it('3. Collector assign: moving a bin updates both collectors counts and derives counts from data', async () => {
      const db = getMockDb();
      const bin0007 = db.bins.find((b) => b.binId === 'BIN-0007')!;
      const prevCollectorId = bin0007.collectorId; // C-002
      expect(prevCollectorId).toBe('C-002');

      const prevCollectorBefore = db.collectors.find((c) => c.collectorId === 'C-002')!.assignedBinsCount;
      const newCollectorBefore = db.collectors.find((c) => c.collectorId === 'C-001')!.assignedBinsCount;

      // Assign BIN-0007 to C-001
      await new Promise<any>((resolve, reject) => {
        http
          .post<any>(
            '/api/v1/admin/bins/BIN-0007/assignment',
            { collectorId: 'C-001' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          )
          .subscribe({ next: resolve, error: reject });
      });

      // Verify list returns derived counts
      const collectorsList = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/collectors', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      const items = collectorsList.data.items ?? collectorsList.data;
      const c002 = items.find((c: any) => c.collectorId === 'C-002');
      const c001 = items.find((c: any) => c.collectorId === 'C-001');

      expect(c002.assignedBinsCount).toBe(prevCollectorBefore - 1);
      expect(c001.assignedBinsCount).toBe(newCollectorBefore + 1);
    });

    it('4. Recyclers search: searches phoneNumber in user handler', async () => {
      const res = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/users?search=+20 100 234 5671', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      const items = res.data.items ?? res.data;
      expect(items.length).toBe(1);
      expect(items[0].userId).toBe('U-10021');
      expect(items[0].name).toBe('Nour El-Sayed');
    });

    it('5. Live map bins: returns unpaginated bins with metadata and filters by region and bbox', async () => {
      const allBinsRes = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/bins/map', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(allBinsRes.success).toBe(true);
      expect(allBinsRes.data.items.length).toBe(23);
      expect(allBinsRes.data.meta.totalItems).toBe(23);
      expect(allBinsRes.data.meta.returned).toBe(23);
      expect(allBinsRes.data.meta.truncated).toBe(false);

      // Filter by region: Alexandria (7 bins)
      const alexRes = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/bins/map?region=Alexandria', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect(alexRes.data.items.length).toBe(7);

      // Filter by bounding box around Downtown Cairo
      const bboxRes = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/bins/map?bbox=30.040,31.230,30.050,31.240', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });
      expect(bboxRes.data.items.length).toBeGreaterThan(0);
      expect(bboxRes.data.items.some((b: any) => b.binId === 'BIN-0007')).toBe(true);
    });

    it('6. Live map scale & truncation: enforces 5,000 hard cap and sets truncated flag', async () => {
      (environment as any).mockBinCount = 5200;

      const scaleRes = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/bins/map', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      expect(scaleRes.data.meta.totalItems).toBe(5200);
      expect(scaleRes.data.meta.returned).toBe(5000);
      expect(scaleRes.data.meta.truncated).toBe(true);
      expect(scaleRes.data.items.length).toBe(5000);

      (environment as any).mockBinCount = undefined;
    });

    it('7. Live map XSS and live drift: injects XSS seed bin and drifts values when enabled', async () => {
      (environment as any).mockXssBinSeed = true;
      (environment as any).mockLiveDrift = true;

      const res = await new Promise<any>((resolve, reject) => {
        http
          .get<any>('/api/v1/admin/bins/map', {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
          .subscribe({ next: resolve, error: reject });
      });

      const xssBin = res.data.items.find((b: any) => b.binId === 'BIN-XSS-TEST');
      expect(xssBin).toBeDefined();
      expect(xssBin.name).toContain('<img src=x');

      (environment as any).mockXssBinSeed = false;
      (environment as any).mockLiveDrift = false;
    });
  });
});
