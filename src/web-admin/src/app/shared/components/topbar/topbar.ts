import { Component, inject, input, output, signal } from '@angular/core';
import { ThemeService } from '../../../core/services/theme/theme.service';
import { Icon } from '../icon/icon';
import { Avatar } from '../avatar/avatar';
import { SearchInput } from '../form/search-input/search-input';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

@Component({
  selector: 'app-topbar',
  imports: [Icon, Avatar, SearchInput],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  readonly themeService = inject(ThemeService);

  readonly title = input<string>('Overview');
  readonly breadcrumbs = input<BreadcrumbItem[]>([]);
  readonly unreadNotifications = input<number>(3);
  readonly userName = input<string>('Sarah Connor');
  readonly userAvatar = input<string>('');
  readonly showSearch = input<boolean>(true);

  readonly toggleSidebar = output<void>();
  readonly search = output<string>();
  readonly notificationClicked = output<void>();
  readonly userMenuClicked = output<void>();

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

  handleNotification(): void {
    this.notificationClicked.emit();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
    this.userMenuClicked.emit();
  }
}
