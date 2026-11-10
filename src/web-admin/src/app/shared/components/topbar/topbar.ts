import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ThemeService } from '../../../core/services/theme/theme.service';
import { Icon, IconName } from '../icon/icon';
import { Avatar } from '../avatar/avatar';
import { SearchInput } from '../form/search-input/search-input';

export interface TopbarMenuItem {
  id: string;
  label: string;
  icon?: IconName | string;
  danger?: boolean;
  dividerBefore?: boolean;
}

@Component({
  selector: 'app-topbar',
  imports: [Icon, Avatar, SearchInput],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  readonly themeService = inject(ThemeService);

  readonly searchPlaceholder = input<string>('Search bins, recyclers, IDs...');
  readonly showSearch = input<boolean>(true);
  readonly unreadNotifications = input<number>(0);
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
  readonly userMenuClicked = output<void>();
  readonly userMenuAction = output<string>();

  readonly isDarkMode = this.themeService.isDark;
  readonly userMenuOpen = signal<boolean>(false);

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
    this.notificationClicked.emit();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
    this.userMenuClicked.emit();
  }

  selectMenuItem(item: TopbarMenuItem): void {
    this.userMenuOpen.set(false);
    this.userMenuAction.emit(item.id);
  }
}
