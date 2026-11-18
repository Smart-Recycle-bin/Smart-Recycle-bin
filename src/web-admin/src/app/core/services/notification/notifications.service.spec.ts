import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationsService } from './notifications.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationsService,
        ApiClientService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch notifications, mark one read, and mark all read', () => {
    service.getNotifications().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/notifications`)
      .flush({ success: true, data: { items: [], unreadCount: 0 } });

    service.markAsRead('notif-01').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/notifications/notif-01/read`)
      .flush({ success: true, data: { id: 'notif-01', unread: false } });

    service.markAllAsRead().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/notifications/mark-all-read`)
      .flush({ success: true, data: { unreadCount: 0 } });
  });
});
