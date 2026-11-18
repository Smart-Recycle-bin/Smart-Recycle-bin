import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { API_ENDPOINTS } from '../api/api-endpoints';
import { NotificationsResponse } from '@models/notification/notification.view-model';

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly apiClient = inject(ApiClientService);

  /**
   * Retrieves active notifications feed and unread counter (PROPOSED, gap_api.md 1.12).
   */
  getNotifications(): Observable<NotificationsResponse> {
    return this.apiClient.get<NotificationsResponse>(API_ENDPOINTS.notification.list);
  }

  /**
   * Marks a single notification as read (PROPOSED, gap_api.md 1.12).
   */
  markAsRead(id: string): Observable<{ id: string; unread: boolean }> {
    return this.apiClient.patch<{ id: string; unread: boolean }>(
      API_ENDPOINTS.notification.markRead(id),
      {}
    );
  }

  /**
   * Marks all notifications as read (PROPOSED, gap_api.md 1.12).
   */
  markAllAsRead(): Observable<{ unreadCount: number }> {
    return this.apiClient.post<{ unreadCount: number }>(
      API_ENDPOINTS.notification.markAllRead,
      {}
    );
  }
}
