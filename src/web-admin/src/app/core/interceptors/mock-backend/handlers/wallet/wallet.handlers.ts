import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { LedgerEntryType } from '@models/wallet/ledger-entry-type.enum';
import { LedgerSource } from '@models/wallet/ledger-source.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog, paginate } from '../handler-utils';
import {
  ManualAdjustmentRequest,
  ManualAdjustmentResponse,
} from '@models/wallet/ledger.dto';
import { LedgerRow } from '@models/wallet/ledger.view-model';

const idempotencyStore = new Map<string, ManualAdjustmentResponse>();

export function clearAdjustmentIdempotencyStore(): void {
  idempotencyStore.clear();
}

export function registerWalletHandlers(router: MockRouter): void {
  // 1. Ledger transactions list with filters
  router.get('/api/v1/admin/ledger', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const type = ctx.query.get('type')?.toLowerCase();
    const source = ctx.query.get('source')?.toLowerCase();
    const search = ctx.query.get('search')?.toLowerCase();
    const userId = ctx.query.get('userId');
    const from = ctx.query.get('from');
    const to = ctx.query.get('to');

    let list = [...db.ledger];

    if (userId) {
      list = list.filter((r) => r.userId === userId);
    }

    if (source) {
      list = list.filter((r) => r.source.toLowerCase() === source);
    } else if (type) {
      list = list.filter((r) => r.entryType.toLowerCase() === type || r.source.toLowerCase() === type);
    }

    if (search) {
      list = list.filter(
        (r) =>
          r.transactionId.toLowerCase().includes(search) ||
          r.userName.toLowerCase().includes(search) ||
          r.userId.toLowerCase().includes(search) ||
          (r.binId && r.binId.toLowerCase().includes(search)) ||
          r.detailText.toLowerCase().includes(search)
      );
    }

    if (from) {
      const fromDate = new Date(from);
      list = list.filter((r) => new Date(r.timestamp) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      list = list.filter((r) => new Date(r.timestamp) <= toDate);
    }

    return paginate(list, ctx.query, {
      sortable: ['timestamp', 'pointsDelta', 'runningBalance', 'userName', 'entryType', 'source'],
      defaultSort: 'timestamp',
      defaultDir: 'desc',
    });
  });

  // 2. Manual points adjustment (APIs.md 5.4)
  router.post<ManualAdjustmentRequest>('/api/v1/admin/ledger/adjustments', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const idempotencyKey = ctx.req.headers.get('Idempotency-Key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      return okResponse(cached, 200);
    }

    const body = ctx.req.body as ManualAdjustmentRequest | null;
    if (!body?.userId || body.amount === undefined || !body.type) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'User ID, amount, and type are required');
    }

    if (body.amount <= 0) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Amount must be greater than zero');
    }

    const db = getMockDb();
    const recycler = db.recyclers.find((r) => r.userId === body.userId);
    if (!recycler) {
      return errorResponse(404, ApiErrorCode.NotFound, `User ${body.userId} not found`);
    }

    if (body.type === LedgerEntryType.Debit && body.amount > recycler.availablePoints) {
      return errorResponse(400, ApiErrorCode.InsufficientBalance, 'Insufficient user points balance');
    }

    const userName = recycler.name;
    const pointsDelta = body.type === LedgerEntryType.Debit ? -Math.abs(body.amount) : Math.abs(body.amount);
    const previousBalance = recycler.availablePoints;
    const newBalance = Math.max(0, previousBalance + pointsDelta);

    recycler.availablePoints = newBalance;
    if (pointsDelta > 0) {
      recycler.lifetimePoints += pointsDelta;
    }

    const transactionId = `tx_${Date.now().toString(36)}`;
    const newLedgerRow: LedgerRow = {
      transactionId,
      timestamp: new Date().toISOString(),
      userId: body.userId,
      userName,
      binId: null,
      detailText: body.reasonNote || `Manual adjustment: ${body.reasonCode || 'Administrative correction'}`,
      pointsDelta,
      runningBalance: newBalance,
      entryType: body.type,
      source: LedgerSource.ManualAdjustment,
      isManualAdjustment: true,
    };

    db.ledger.unshift(newLedgerRow);

    appendAuditLog(
      AuditActionType.LedgerAdjustment,
      body.userId,
      `Manual points adjustment (${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts): ${body.reasonNote || body.reasonCode}`,
      auth.user
    );

    const response: ManualAdjustmentResponse = {
      transactionId,
      userId: body.userId,
      pointsDelta,
      balanceAfter: newBalance,
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, response);
    }

    return okResponse(response, 201);
  });
}
