import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '../../engine/mock-router';
import { getMockDb } from '../../../../mock/db/mock-db';
import { AuditActionType } from '../../../../models/audit/audit-action-type.enum';
import { LedgerEntryType } from '../../../../models/wallet/ledger-entry-type.enum';
import { LedgerSource } from '../../../../models/wallet/ledger-source.enum';
import { ApiErrorCode } from '../../../../models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog } from '../handler-utils';
import {
  ManualAdjustmentRequest,
  ManualAdjustmentResponse,
} from '../../../../models/wallet/ledger.dto';
import { LedgerRow } from '../../../../models/wallet/ledger.view-model';

export function registerWalletHandlers(router: MockRouter): void {
  // 1. Ledger transactions list with filters
  router.get('/api/v1/admin/ledger', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const type = ctx.query.get('type')?.toLowerCase();
    const search = ctx.query.get('search')?.toLowerCase();
    const userId = ctx.query.get('userId');

    let list = [...db.ledger];

    if (userId) {
      list = list.filter((r) => r.userId === userId);
    }

    if (type) {
      list = list.filter((r) => r.entryType.toLowerCase() === type);
    }

    if (search) {
      list = list.filter(
        (r) =>
          r.transactionId.toLowerCase().includes(search) ||
          r.userName.toLowerCase().includes(search) ||
          r.detailText.toLowerCase().includes(search)
      );
    }

    return okResponse(list);
  });

  // 2. Manual points adjustment
  router.post<ManualAdjustmentRequest>('/api/v1/admin/ledger/adjust', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const body = ctx.req.body as ManualAdjustmentRequest | null;
    if (!body?.userId || body.amount === undefined || !body.type) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'User ID, amount, and type are required');
    }

    const db = getMockDb();
    const recycler = db.recyclers.find((r) => r.userId === body.userId);
    const userName = recycler ? recycler.name : `User ${body.userId}`;

    const pointsDelta = body.type === LedgerEntryType.Debit ? -Math.abs(body.amount) : Math.abs(body.amount);
    const previousBalance = recycler?.availablePoints ?? 1000;
    const newBalance = Math.max(0, previousBalance + pointsDelta);

    if (recycler) {
      recycler.availablePoints = newBalance;
      if (pointsDelta > 0) {
        recycler.lifetimePoints += pointsDelta;
      }
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
      newAvailablePoints: newBalance,
      adjustedAt: new Date().toISOString(),
    };

    return okResponse(response);
  });
}
