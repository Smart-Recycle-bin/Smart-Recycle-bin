import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { ApiResponse } from '@models/common/api-response.dto';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { PageMeta, PageQuery } from '@models/common/page.model';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { AuditLogRow } from '@models/audit/audit.view-model';
import { getMockDb } from '@core/mock/db/mock-db';
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

export function okPagedResponse<T>(
  data: T[],
  meta: PageMeta,
  status = 200
): HttpResponse<ApiResponse<T[]>> {
  return new HttpResponse<ApiResponse<T[]>>({
    status,
    body: {
      success: true,
      data,
      meta,
    },
  });
}

export interface PaginateOptions<T> {
  sortable: (keyof T | string)[];
  defaultSort?: keyof T | string;
  defaultDir?: 'asc' | 'desc';
}

export function paginate<T>(
  list: T[],
  query: URLSearchParams | Record<string, unknown> | PageQuery | undefined,
  options: PaginateOptions<T>
): HttpResponse<ApiResponse<T[]>> | HttpErrorResponse {
  let pageParam: string | null = null;
  let pageSizeParam: string | null = null;
  let sortByParam: string | null = null;
  let sortDirParam: string | null = null;

  if (query instanceof URLSearchParams) {
    pageParam = query.get('page');
    pageSizeParam = query.get('pageSize');
    sortByParam = query.get('sortBy');
    sortDirParam = query.get('sortDir');
  } else if (query && typeof query === 'object') {
    const q = query as Record<string, unknown>;
    pageParam = q['page'] !== undefined && q['page'] !== null ? String(q['page']) : null;
    pageSizeParam = q['pageSize'] !== undefined && q['pageSize'] !== null ? String(q['pageSize']) : null;
    sortByParam = q['sortBy'] !== undefined && q['sortBy'] !== null ? String(q['sortBy']) : null;
    sortDirParam = q['sortDir'] !== undefined && q['sortDir'] !== null ? String(q['sortDir']) : null;
  }

  // Validate sortBy if provided
  if (sortByParam !== null && sortByParam !== '') {
    if (!options.sortable.includes(sortByParam as keyof T)) {
      return errorResponse(
        400,
        ApiErrorCode.ValidationError,
        `Invalid sortBy "${sortByParam}". Allowed fields: ${options.sortable.map(String).join(', ')}`
      );
    }
  }

  // Validate sortDir if provided
  if (sortDirParam !== null && sortDirParam !== '') {
    const lowerDir = sortDirParam.toLowerCase();
    if (lowerDir !== 'asc' && lowerDir !== 'desc') {
      return errorResponse(
        400,
        ApiErrorCode.ValidationError,
        `Invalid sortDir "${sortDirParam}". Allowed values: "asc", "desc"`
      );
    }
  }

  // Perform stable sort
  const sortKey = (sortByParam || options.defaultSort) as string | undefined;
  const sortDir = (sortDirParam?.toLowerCase() || options.defaultDir || 'asc') as 'asc' | 'desc';

  let sortedList = [...list];
  if (sortKey) {
    sortedList = sortedList
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const valA = (a.item as Record<string, unknown>)[sortKey];
        const valB = (b.item as Record<string, unknown>)[sortKey];

        if (valA === valB) return a.index - b.index;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const isDateKey = /timestamp|date|lastactive|lastserviced/i.test(sortKey);
        let comparison = 0;

        if (isDateKey && typeof valA === 'string' && typeof valB === 'string') {
          const timeA = new Date(valA).getTime();
          const timeB = new Date(valB).getTime();
          if (!isNaN(timeA) && !isNaN(timeB)) {
            comparison = timeA - timeB;
          } else {
            comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
          }
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        }

        if (comparison === 0) return a.index - b.index;
        return sortDir === 'asc' ? comparison : -comparison;
      })
      .map((entry) => entry.item);
  }

  // If no page was requested, return full array without meta (non-breaking, backward-compatible)
  if (pageParam === null || pageParam === undefined || pageParam === '') {
    return okResponse(sortedList);
  }

  // Validate page
  const pageNum = Number(pageParam);
  if (!/^\d+$/.test(pageParam.trim()) || !Number.isInteger(pageNum) || pageNum < 1) {
    return errorResponse(
      400,
      ApiErrorCode.ValidationError,
      `Invalid page "${pageParam}". Must be an integer >= 1`
    );
  }

  // Validate pageSize
  let pageSizeNum = 10;
  if (pageSizeParam !== null && pageSizeParam !== '') {
    pageSizeNum = Number(pageSizeParam);
    if (!/^\d+$/.test(pageSizeParam.trim()) || !Number.isInteger(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      return errorResponse(
        400,
        ApiErrorCode.ValidationError,
        `Invalid pageSize "${pageSizeParam}". Must be an integer between 1 and 100`
      );
    }
  }

  const totalItems = sortedList.length;
  const totalPages = Math.ceil(totalItems / pageSizeNum);

  let pagedItems: T[] = [];
  if (pageNum <= totalPages) {
    const startIndex = (pageNum - 1) * pageSizeNum;
    pagedItems = sortedList.slice(startIndex, startIndex + pageSizeNum);
  }

  const meta: PageMeta = {
    page: pageNum,
    pageSize: pageSizeNum,
    totalItems,
    totalPages,
  };

  return okPagedResponse(pagedItems, meta);
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
