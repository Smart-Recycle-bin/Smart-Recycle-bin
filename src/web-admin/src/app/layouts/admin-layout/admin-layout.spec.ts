import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AdminLayout } from './admin-layout';
import { AuthService } from '@services/auth/auth.service';
import { NotificationsService } from '@services/notification/notifications.service';
import { ReviewQueueStateService } from '@services/inspection/review-queue-state.service';
import { OnlineService } from '@services/online/online.service';
import {
  NotificationItem,
  NotificationsResponse,
} from '@models/notification/notification.view-model';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;
  let authServiceSpy: {
    session: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };
  let notificationsServiceSpy: {
    getNotifications: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
    markAllAsRead: ReturnType<typeof vi.fn>;
  };
  let reviewQueueStateSpy: {
    pendingCount: ReturnType<typeof signal<number>>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let onlineServiceSpy: {
    isOnline: ReturnType<typeof signal<boolean>>;
  };
  let router: Router;

  const mockNotificationItems: NotificationItem[] = [
    { id: 'notif-1', title: 'Bin Overfilled', message: 'Bin #001 is full', time: '5m ago', unread: true },
    { id: 'notif-2', title: 'Telemetry Offline', message: 'Bin #002 disconnected', time: '15m ago', unread: true },
    { id: 'notif-3', title: 'Maintenance Done', message: 'Bin #003 serviced', time: '1h ago', unread: false },
  ];

  const mockNotificationsResponse: NotificationsResponse = {
    items: mockNotificationItems,
    unreadCount: 2,
  };

  beforeEach(async () => {
    authServiceSpy = {
      session: signal(null),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    notificationsServiceSpy = {
      getNotifications: vi.fn().mockReturnValue(of(mockNotificationsResponse)),
      markAsRead: vi.fn().mockImplementation((id: string) => of({ id, unread: false })),
      markAllAsRead: vi.fn().mockReturnValue(of({ unreadCount: 0 })),
    };

    reviewQueueStateSpy = {
      pendingCount: signal(5),
      refresh: vi.fn().mockReturnValue(of({ pendingReviewCount: 5 })),
    };

    onlineServiceSpy = {
      isOnline: signal(true),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationsService, useValue: notificationsServiceSpy },
        { provide: ReviewQueueStateService, useValue: reviewQueueStateSpy },
        { provide: OnlineService, useValue: onlineServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create with Sidebar, Topbar, and RouterOutlet', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-sidebar')).toBeTruthy();
    expect(el.querySelector('app-topbar')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should load notifications on mount and bind them to topbar', () => {
    expect(notificationsServiceSpy.getNotifications).toHaveBeenCalledTimes(1);
    expect(component.notifications().length).toBe(3);
    expect(component.unreadNotifications()).toBe(2);

    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('.notif-badge');
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('should reload notifications when bell is clicked', () => {
    notificationsServiceSpy.getNotifications.mockClear();

    const el = fixture.nativeElement as HTMLElement;
    const notifBtn = el.querySelector('.notif-btn') as HTMLButtonElement;
    expect(notifBtn).toBeTruthy();

    notifBtn.click();
    fixture.detectChanges();

    expect(notificationsServiceSpy.getNotifications).toHaveBeenCalledTimes(1);
  });

  it('should mark single item as read and decrement unread counter', () => {
    const unreadItem = component.notifications()[0];
    expect(unreadItem.unread).toBe(true);

    component.handleNotificationItemClick(unreadItem);
    expect(notificationsServiceSpy.markAsRead).toHaveBeenCalledWith('notif-1');

    const updated = component.notifications().find((n) => n.id === 'notif-1');
    expect(updated?.unread).toBe(false);
    expect(component.unreadNotifications()).toBe(1);
  });

  it('should not call markAsRead if item is already read', () => {
    const readItem = component.notifications()[2];
    expect(readItem.unread).toBe(false);

    component.handleNotificationItemClick(readItem);
    expect(notificationsServiceSpy.markAsRead).not.toHaveBeenCalled();
    expect(component.unreadNotifications()).toBe(2);
  });

  it('should mark all notifications as read and reset unread counter to 0', () => {
    component.handleNotificationsMarkAllRead();
    expect(notificationsServiceSpy.markAllAsRead).toHaveBeenCalledTimes(1);

    expect(component.notifications().every((n) => !n.unread)).toBe(true);
    expect(component.unreadNotifications()).toBe(0);
  });

  it('should reflect pendingCount as the badge on the review-queue nav item', () => {
    expect(reviewQueueStateSpy.refresh).toHaveBeenCalledTimes(1);

    const sections = component.navSections();
    const reviewItem = sections
      .flatMap((s) => s.items)
      .find((item) => item.route === '/review-queue');

    expect(reviewItem).toBeDefined();
    expect(reviewItem?.badge).toBe(5);

    // Update signal
    reviewQueueStateSpy.pendingCount.set(0);
    fixture.detectChanges();

    const updatedSections = component.navSections();
    const updatedReviewItem = updatedSections
      .flatMap((s) => s.items)
      .find((item) => item.route === '/review-queue');

    expect(updatedReviewItem?.badge).toBeUndefined();
  });

  it('should configure user menu with only "Sign out"', () => {
    expect(component.userMenuItems).toEqual([
      { id: 'logout', label: 'Sign out', icon: 'log-out', danger: true },
    ]);
  });

  it('should reflect user name and role from current user service', () => {
    expect(component.activeUser()).toBeNull();

    authServiceSpy.session.set({
      accessToken: 'tok',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: 'ref',
      user: {
        userId: 'ADM-001',
        displayName: 'Sarah Connor',
        role: 'SYS_ADMIN',
      },
    });
    fixture.detectChanges();

    expect(component.activeUser()?.role).toBe('SYS_ADMIN');
    expect(component.activeUser()?.name).toBe('Sarah Connor');
  });

  it('should toggle sidebar collapse and mobile drawer', () => {
    expect(component.sidebarCollapsed()).toBe(false);
    component.toggleCollapse();
    expect(component.sidebarCollapsed()).toBe(true);

    expect(component.mobileSidebarOpen()).toBe(false);
    component.toggleMobileSidebar();
    expect(component.mobileSidebarOpen()).toBe(true);
    component.closeMobileSidebar();
    expect(component.mobileSidebarOpen()).toBe(false);
  });

  it('should call AuthService.logout() and navigate to /login when userMenuAction is logout', () => {
    component.handleUserMenuAction('logout');

    expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('renders offline banner when network is disconnected and hides when online', () => {
    onlineServiceSpy.isOnline.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="offline-banner"]')).toBeNull();

    onlineServiceSpy.isOnline.set(false);
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('[data-testid="offline-banner"]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain("You are offline — changes can't be saved");
  });

  it('renders skip link targeting main-content with correct attributes', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const skipLink = el.querySelector<HTMLAnchorElement>('a.skip-to-content');
    expect(skipLink).toBeTruthy();
    expect(skipLink?.getAttribute('href')).toBe('#main-content');
    expect(skipLink?.textContent?.trim()).toBe('Skip to main content');

    const main = el.querySelector('main#main-content');
    expect(main).toBeTruthy();
    expect(main?.getAttribute('tabindex')).toBe('-1');
  });
});
