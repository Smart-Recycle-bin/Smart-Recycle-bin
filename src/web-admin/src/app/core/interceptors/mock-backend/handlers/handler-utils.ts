import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { ApiResponse } from '../../../models/common/api-response.dto';
import { ApiErrorCode } from '../../../models/common/api-error-code.enum';
import { AuditActionType } from '../../../models/audit/audit-action-type.enum';
import { AuditLogRow } from '../../../models/audit/audit.view-model';
import { getMockDb } from '../../../mock/db/mock-db';
import { authenticateMockRequest, MockTokenPayload } from '../engine/mock-auth';

export function okResponse<T>(data: T, status = 200): HttpResponse<ApiResponse<T>> {
  return new HttpResponse<ApiResponse<T>>({
    status,
    body: {
      success: true,
      data,
    },
  });
}

export function errorResponse(status: number, code: string, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText:
      status === 400
        ? 'Bad Request'
        : status === 401
          ? 'Unauthorized'
          : status === 403
            ? 'Forbidden'
            : status === 404
              ? 'Not Found'
              : status === 409
                ? 'Conflict'
                : 'Error',
    error: {
      success: false,
      error: {
        code,
        message,
      },
    },
  });
}

export function appendAuditLog(
  actionType: AuditActionType,
  resourceId: string,
  justification: string,
  adminUser?: { userId: string; displayName?: string }
): void {
  const db = getMockDb();
  const adminId = adminUser?.userId ?? 'ADM-001';
  const adminName = adminUser?.displayName || 'Sarah Connor';
  const adminInitials =
    adminName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'SC';

  const newLog: AuditLogRow = {
    auditId: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    adminId,
    adminName,
    adminInitials,
    actionType,
    resourceId,
    justification,
    ipAddress: '192.168.1.104',
  };

  db.auditLogs.unshift(newLog);
}

export function requireSysAdmin(
  req: HttpRequest<unknown>
): { user: MockTokenPayload } | HttpErrorResponse {
  const authResult = authenticateMockRequest(req, true);
  if (!authResult.authenticated || !authResult.user) {
    return (
      authResult.errorResponse ??
      errorResponse(401, ApiErrorCode.Unauthorized, 'Authentication required')
    );
  }
  return { user: authResult.user };
}
