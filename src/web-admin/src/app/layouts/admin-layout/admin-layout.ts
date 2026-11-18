import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ADMIN_NAV_SECTIONS } from './admin-nav';
import { CurrentUser, CurrentUserService } from '@services/user/current-user.service';
import { AuthService } from '@services/auth/auth.service';
import { NotificationsService } from '@services/notification/notifications.service';
import { ReviewQueueStateService } from '@services/inspection/review-queue-state.service';
import { NotificationItem } from '@models/notification/notification.view-model';
import { Sidebar, SidebarSection } from '@shared/components/sidebar/sidebar';
import { Topbar, TopbarMenuItem } from '@shared/components/topbar/topbar';
import { Icon } from '@shared/components/icon/icon';
import { OnlineService } from '@services/online/online.service';

@Component({
  selector: 'app-admin-layout',
  imports: [Sidebar, Topbar, RouterOutlet, Icon],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout implements OnInit {
  private readonly currentUserService = inject(CurrentUserService);
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  private readonly reviewQueueState = inject(ReviewQueueStateService);
  private readonly onlineService = inject(OnlineService);
  private readonly router = inject(Router);

  readonly currentUser = input<CurrentUser | null>(null);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadNotifications = signal<number>(0);

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly mobileSidebarOpen = signal<boolean>(false);

  readonly isOffline = computed(() => !this.onlineService.isOnline());
  readonly routeAnnouncement = signal<string>('');

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        let route = this.router.routerState.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        const title = route.snapshot.data?.['title'];
        if (title) {
          this.routeAnnouncement.set(`${title} loaded`);
        }
        setTimeout(() => {
          if (typeof document !== 'undefined') {
            const h1 = document.querySelector<HTMLElement>('main h1, h1');
            if (h1) {
              if (!h1.hasAttribute('tabindex')) {
                h1.setAttribute('tabindex', '-1');
              }
              h1.focus();
            }
          }
        }, 100);
      });
  }

  readonly activeUser = computed(() => this.currentUser() ?? this.currentUserService.user());

  readonly navSections = computed<SidebarSection[]>(() => {
    const pendingCount = this.reviewQueueState.pendingCount();
    return ADMIN_NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.route === '/review-queue' || item.id === 'review-queue') {
          return {
            ...item,
            badge: pendingCount > 0 ? pendingCount : undefined,
          };
        }
        return item;
      }),
    }));
  });

  readonly userMenuItems: TopbarMenuItem[] = [
    { id: 'logout', label: 'Sign out', icon: 'log-out', danger: true },
  ];

  ngOnInit(): void {
    this.loadNotifications();
    this.reviewQueueState.refresh().subscribe({
      error: () => {
        // Silently handle error or retain existing pending count
      },
    });
  }

  loadNotifications(): void {
    this.notificationsService.getNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res.items);
        this.unreadNotifications.set(res.unreadCount);
      },
      error: () => {
        // Silently handle
      },
    });
  }

  handleNotificationItemClick(item: NotificationItem): void {
    if (item.unread) {
      this.notificationsService.markAsRead(item.id).subscribe({
        next: (res) => {
          this.notifications.update((items) =>
            items.map((it) => (it.id === res.id ? { ...it, unread: res.unread } : it))
          );
          this.unreadNotifications.update((count) => Math.max(0, count - 1));
        },
        error: () => {},
      });
    }
  }

  handleNotificationsMarkAllRead(): void {
    this.notificationsService.markAllAsRead().subscribe({
      next: (res) => {
        this.notifications.update((items) =>
          items.map((it) => ({ ...it, unread: false }))
        );
        this.unreadNotifications.set(res.unreadCount ?? 0);
      },
      error: () => {},
    });
  }

  toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  handleUserMenuAction(actionId: string): void {
    if (actionId === 'logout') {
      this.authService.logout().subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: () => {
          this.router.navigate(['/login']);
        },
      });
    }
  }
}
