import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ADMIN_NAV_SECTIONS } from '../../core/navigation/admin-nav';
import { CurrentUser, CurrentUserService } from '../../core/services/user/current-user.service';
import { Sidebar, SidebarSection } from '../../shared/components/sidebar/sidebar';
import { Topbar } from '../../shared/components/topbar/topbar';

@Component({
  selector: 'app-admin-layout',
  imports: [Sidebar, Topbar, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly currentUserService = inject(CurrentUserService);

  readonly navSections = input<SidebarSection[]>(ADMIN_NAV_SECTIONS);
  readonly currentUser = input<CurrentUser | null>(null);
  readonly unreadNotifications = input<number>(0);

  readonly searchTriggered = output<string>();

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly mobileSidebarOpen = signal<boolean>(false);

  readonly activeUser = computed(() => this.currentUser() ?? this.currentUserService.user());

  toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
