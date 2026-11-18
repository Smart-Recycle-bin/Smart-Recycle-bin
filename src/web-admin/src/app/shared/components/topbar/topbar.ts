import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ThemeService } from '@services/theme/theme.service';
import { Icon } from '../icon/icon';
import { Avatar } from '../avatar/avatar';
import { SearchInput } from '../form/search-input/search-input';
import { DropdownMenu, DropdownMenuItem } from '../overlay/dropdown-menu/dropdown-menu';
import {
  NotificationItem,
  NotificationsPanel,
} from '../notifications-panel/notifications-panel';
import { TooltipDirective } from '../tooltip/tooltip.directive';

export type TopbarMenuItem = DropdownMenuItem;

@Component({
  selector: 'app-topbar',
  imports: [Icon, Avatar, SearchInput, DropdownMenu, NotificationsPanel, TooltipDirective],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  readonly themeService = inject(ThemeService);

  readonly searchPlaceholder = input<string>('Search bins, recyclers, IDs...');
  readonly showSearch = input<boolean>(true);
  readonly unreadNotifications = input<number>(0);
  readonly notifications = input<NotificationItem[]>([]);
  readonly userName = input<string>('');
  readonly userRole = input<string>('');
  readonly userAvatar = input<string>('');
  readonly userMenuItems = input<TopbarMenuItem[]>([
    { id: 'profile', label: 'Profile settings', icon: 'user' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
    { id: 'logout', label: 'Sign out', icon: 'log-out', danger: true, dividerBefore: true },
  ]);

  readonly toggleSidebar = output<void>();
  readonly search = output<string>();
  readonly searchChange = output<string>();
  readonly notificationClicked = output<void>();
  readonly notificationItemClicked = output<NotificationItem>();
  readonly notificationsMarkAllRead = output<void>();
  readonly userMenuClicked = output<void>();
  readonly userMenuAction = output<string>();

  readonly isDarkMode = this.themeService.isDark;
  readonly notificationsOpen = signal<boolean>(false);
  readonly userMenuOpen = signal<boolean>(false);

  readonly notifAriaLabel = computed(() => {
    const count = this.unreadNotifications();
    if (count > 0) {
      const display = count > 9 ? '9+' : `${count}`;
      return `Notifications, ${display} unread`;
    }
    return 'Notifications';
  });

  readonly notifWrapper = viewChild<ElementRef<HTMLElement>>('notifWrapper');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notificationsOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.notifWrapper()?.nativeElement.contains(target)) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.notificationsOpen()) {
      this.notificationsOpen.set(false);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  handleToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  handleSearch(query: string): void {
    this.search.emit(query);
  }

  handleSearchChange(query: string): void {
    this.searchChange.emit(query);
  }

  handleNotification(): void {
    this.notificationsOpen.update((v) => !v);
    this.notificationClicked.emit();
  }

  handleMenuOpened(open: boolean): void {
    this.userMenuOpen.set(open);
    if (open) {
      this.notificationsOpen.set(false);
      this.userMenuClicked.emit();
    }
  }

  selectMenuItem(item: TopbarMenuItem): void {
    this.userMenuAction.emit(item.id);
  }
}
