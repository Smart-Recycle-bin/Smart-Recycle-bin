import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter, MockRequestContext } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, paginate } from '../handler-utils';
import {
  CorrectCategoryRequest,
  InspectionActionResponse,
} from '@models/inspection/inspection.dto';
import { InspectionSummary } from '@models/inspection/inspection.view-model';

/**
 * Derives and synchronizes all inspection summary counters directly from
 * the reports list (single source of truth).
 * - Pending: reports with status Pending
 * - Reviewed: reports with status Reviewed or Sent to Retraining (matching card label)
 * - Remaining until retrain: target threshold minus labelled images count
 */
export function syncInspectionSummary(db: ReturnType<typeof getMockDb>): InspectionSummary {
  const pending = db.inspectionReports.filter(
    (r) => r.status === InspectionReportStatus.Pending
  ).length;
  const reviewed = db.inspectionReports.filter(
    (r) =>
      r.status === InspectionReportStatus.Reviewed ||
      r.status === InspectionReportStatus.SentToRetraining
  ).length;

  db.inspectionSummary.pendingReviewCount = pending;
  db.inspectionSummary.reviewedCount = reviewed;
  db.inspectionSummary.remainingUntilRetrain = Math.max(
    0,
    db.inspectionSummary.targetImagesThreshold - db.inspectionSummary.labelledImagesCount
  );

  return db.inspectionSummary;
}

function resolveInspectionTarget(ctx: MockRequestContext<unknown>):
  | { readonly ok: false; readonly error: HttpErrorResponse }
  | {
      readonly ok: true;
      readonly reportId: string;
      readonly report: ReturnType<typeof getMockDb>['inspectionReports'][number] | undefined;
      readonly detail: ReturnType<typeof getMockDb>['inspectionDetails'][string] | undefined;
      readonly db: ReturnType<typeof getMockDb>;
    } {
  const auth = requireSysAdmin(ctx.req);
  if (auth instanceof HttpErrorResponse) {
    return { ok: false, error: auth };
  }

  const reportId = ctx.params['reportId'] ?? '';
  const db = getMockDb();
  const report = db.inspectionReports.find((r) => r.reportId === reportId || r.airId === reportId);
  const detail = db.inspectionDetails[reportId];

  if (!report && !detail) {
    return {
      ok: false,
      error: errorResponse(404, ApiErrorCode.NotFound, `Inspection report ${reportId} not found`),
    };
  }

  return { ok: true, reportId, report, detail, db };
}

export function registerInspectionHandlers(router: MockRouter): void {
  // 1. Dataset retraining summary metrics
  router.get('/api/v1/admin/inspections/summary', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    return okResponse(syncInspectionSummary(db));
  });

  // 2. Inspection reports review queue
  router.get('/api/v1/admin/inspections', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const status = ctx.query.get('status')?.toLowerCase();
    const search = ctx.query.get('search')?.toLowerCase();

    let list = [...db.inspectionReports];

    if (status) {
      list = list.filter((r) => r.status.toLowerCase() === status);
    }

    if (search) {
      list = list.filter(
        (r) =>
          r.airId.toLowerCase().includes(search) ||
          r.binId.toLowerCase().includes(search) ||
          r.mlPredictedWasteType.toLowerCase().includes(search)
      );
    }

    return paginate(list, ctx.query, {
      sortable: ['date', 'status', 'mlPredictedWasteType', 'mlConfidence', 'airId', 'reportId'],
      defaultSort: 'date',
      defaultDir: 'desc',
    });
  });

  // 3. Inspection report detail
  router.get('/api/v1/admin/inspections/:reportId', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const reportId = ctx.params['reportId'] ?? '';
    const db = getMockDb();
    const detail = db.inspectionDetails[reportId];

    if (!detail) {
      return errorResponse(404, ApiErrorCode.NotFound, `Inspection report ${reportId} not found`);
    }

    return okResponse(detail);
  });

  // 4. Correct prediction waste category
  router.post<CorrectCategoryRequest>('/api/v1/admin/inspections/:reportId/correct', (ctx) => {
    const target = resolveInspectionTarget(ctx);
    if (!target.ok) return target.error;
    const { reportId, report, detail, db } = target;

    const body = ctx.req.body as CorrectCategoryRequest | null;
    const newStatus = InspectionReportStatus.Reviewed;

    if (report) {
      report.status = newStatus;
      if (body?.wasteTypeId) {
        report.mlPredictedWasteType = body.wasteTypeId;
      }
    }
    if (detail) {
      detail.status = newStatus;
      if (body?.wasteTypeId) {
        detail.predictedWasteType = body.wasteTypeId;
      }
    }

    syncInspectionSummary(db);

    const response: InspectionActionResponse = {
      reportId,
      status: newStatus,
      message: 'Category corrected successfully',
      resolvedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });

  // 5. Dismiss inspection report
  router.post('/api/v1/admin/inspections/:reportId/dismiss', (ctx) => {
    const target = resolveInspectionTarget(ctx);
    if (!target.ok) return target.error;
    const { reportId, report, detail, db } = target;

    const newStatus = InspectionReportStatus.Reviewed;
    if (report) {
      report.status = newStatus;
    }
    if (detail) {
      detail.status = newStatus;
    }

    syncInspectionSummary(db);

    const response: InspectionActionResponse = {
      reportId,
      status: newStatus,
      message: 'Report dismissed',
      resolvedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });

  // 6. Send report to retraining dataset
  router.post('/api/v1/admin/inspections/:reportId/retrain', (ctx) => {
    const target = resolveInspectionTarget(ctx);
    if (!target.ok) return target.error;
    const { reportId, report, detail, db } = target;

    const newStatus = InspectionReportStatus.SentToRetraining;
    if (report) {
      report.status = newStatus;
    }
    if (detail) {
      detail.status = newStatus;
    }

    db.inspectionSummary.labelledImagesCount += 1;
    syncInspectionSummary(db);

    const response: InspectionActionResponse = {
      reportId,
      status: newStatus,
      message: 'Report sent to retraining dataset',
      resolvedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });

  // 7. Available waste types
  router.get('/api/v1/admin/waste-types', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    return okResponse(db.wasteTypes);
  });
}
