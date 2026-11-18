import { HttpErrorResponse } from '@angular/common/http';
import { MockRouter } from '@core/interceptors/mock-backend/engine/mock-router';
import { getMockDb } from '@core/mock/db/mock-db';
import { okResponse, requireSysAdmin } from '../handler-utils';
import { NotificationsResponse } from '@models/notification/notification.view-model';

export function registerNotificationHandlers(router: MockRouter): void {
  // 1. List notifications
  router.get('/api/v1/admin/notifications', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    const items = [...db.notifications];
    const unreadCount = items.filter((n) => n.unread).length;

    const response: NotificationsResponse = {
      items,
      unreadCount,
    };

    return okResponse(response);
  });

  // 2. Mark single notification as read
  const handleMarkRead = (ctx: { params: Record<string, string> }) => {
    const id = ctx.params['id'];
    const db = getMockDb();
    const item = db.notifications.find((n) => n.id === id);

    if (item) {
      item.unread = false;
    }

    return okResponse({ id, unread: false });
  };

  router.patch('/api/v1/admin/notifications/:id/read', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }
    return handleMarkRead(ctx);
  });

  router.post('/api/v1/admin/notifications/:id/read', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }
    return handleMarkRead(ctx);
  });

  // 3. Mark all notifications as read
  router.post('/api/v1/admin/notifications/mark-all-read', (ctx) => {
    const auth = requireSysAdmin(ctx.req);
    if (auth instanceof HttpErrorResponse) {
      return auth;
    }

    const db = getMockDb();
    for (const n of db.notifications) {
      n.unread = false;
    }

    return okResponse({ unreadCount: 0 });
  });
}
