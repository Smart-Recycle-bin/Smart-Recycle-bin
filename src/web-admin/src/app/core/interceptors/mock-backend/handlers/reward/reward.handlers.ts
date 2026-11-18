import { MOCK_IMAGE_URL } from '@core/mock/data/_assets';
import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { RewardStatus } from '@models/reward/reward-status.enum';
import { RewardCategory } from '@models/reward/reward-category.enum';
import { VoucherCodeType } from '@models/reward/voucher-code-type.enum';
import { AuditActionType } from '@models/audit/audit-action-type.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { okResponse, errorResponse, requireSysAdmin, appendAuditLog } from '../handler-utils';
import {
  CreateRewardRequest,
  UpdateRewardRequest,
  ArchiveRewardResponse,
} from '@models/reward/reward.dto';
import { AdminRewardItem } from '@models/reward/reward.view-model';

export function registerRewardHandlers(router: MockRouter): void {
  // 1. List catalog items with filters
  router.get('/api/v1/admin/catalog', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const category = ctx.query.get('category')?.toLowerCase();
    const status = ctx.query.get('status')?.toLowerCase();
    const search = ctx.query.get('search')?.toLowerCase();

    let list = [...db.rewards];

    if (category) {
      list = list.filter((r) => r.category.toLowerCase() === category);
    }

    if (status) {
      list = list.filter((r) => r.status.toLowerCase() === status);
    }

    if (search) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.code.toLowerCase().includes(search)
      );
    }

    return okResponse(list);
  });

  // 2. Create catalog item (APIs.md 6.2)
  router.post<CreateRewardRequest>('/api/v1/admin/catalog', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const body = ctx.req.body as CreateRewardRequest | null;
    if (!body?.title || body.pointsCost === undefined || body.stock === undefined) {
      return errorResponse(400, ApiErrorCode.ValidationError, 'Title, pointsCost, and stock are required');
    }

    const db = getMockDb();
    const itemId = `rwd_${Date.now().toString(36)}`;
    const code = `RWD-${Math.floor(100 + Math.random() * 900)}`;

    const newReward: AdminRewardItem = {
      itemId,
      code,
      title: body.title,
      description: body.description || '',
      category: (body.category as RewardCategory) || RewardCategory.Groceries,
      voucherCodeType: body.voucherCodeType || VoucherCodeType.Code,
      pointsCost: body.pointsCost,
      stock: body.stock,
      redemptionsCount: 0,
      status: body.stock > 0 ? RewardStatus.InStock : RewardStatus.OutOfStock,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      imageUrl: body.imageUrl,
    };

    db.rewards.unshift(newReward);

    appendAuditLog(
      AuditActionType.CatalogChange,
      itemId,
      `New reward item added: ${body.title} (${body.pointsCost} pts)`,
      auth.user
    );

    return okResponse(newReward, 201);
  });

  // 3. Update catalog item (APIs.md 6.3)
  router.put<UpdateRewardRequest>('/api/v1/admin/catalog/:itemId', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const itemId = ctx.params['itemId'] ?? '';
    const db = getMockDb();
    const reward = db.rewards.find((r) => r.itemId === itemId || r.code === itemId);

    if (!reward) {
      return errorResponse(404, ApiErrorCode.NotFound, `Reward ${itemId} not found`);
    }

    const body = ctx.req.body as UpdateRewardRequest | null;
    if (body?.title) {
      reward.title = body.title;
    }
    if (body?.description !== undefined) {
      reward.description = body.description;
    }
    if (body?.category) {
      reward.category = body.category as RewardCategory;
    }
    if (body?.pointsCost !== undefined) {
      reward.pointsCost = body.pointsCost;
    }
    if (body?.stock !== undefined) {
      reward.stock = body.stock;
      if (reward.status !== RewardStatus.Archived) {
        reward.status = body.stock > 0 ? RewardStatus.InStock : RewardStatus.OutOfStock;
      }
    }
    if (body?.voucherCodeType) {
      reward.voucherCodeType = body.voucherCodeType;
    }
    if (body?.validFrom !== undefined) {
      reward.validFrom = body.validFrom;
    }
    if (body?.validUntil !== undefined) {
      reward.validUntil = body.validUntil;
    }
    if (body?.imageUrl !== undefined) {
      reward.imageUrl = body.imageUrl;
    }

    appendAuditLog(
      AuditActionType.CatalogChange,
      reward.itemId,
      `Reward updated: ${reward.title}`,
      auth.user
    );

    return okResponse(reward);
  });

  // 4. Archive catalog item (APIs.md 6.4)
  router.post('/api/v1/admin/catalog/:itemId/archive', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const itemId = ctx.params['itemId'] ?? '';
    const db = getMockDb();
    const reward = db.rewards.find((r) => r.itemId === itemId || r.code === itemId);

    if (!reward) {
      return errorResponse(404, ApiErrorCode.NotFound, `Reward ${itemId} not found`);
    }

    reward.status = RewardStatus.Archived;

    appendAuditLog(
      AuditActionType.CatalogChange,
      reward.itemId,
      `Reward archived: ${reward.title}`,
      auth.user
    );

    const response: ArchiveRewardResponse = {
      itemId: reward.itemId,
      status: RewardStatus.Archived,
      message: 'Reward item archived successfully',
    };

    return okResponse(response);
  });

  // 5. Upload image
  router.post('/api/v1/admin/catalog/upload-image', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    return okResponse({
      imageUrl: MOCK_IMAGE_URL,
    });
  });
}
