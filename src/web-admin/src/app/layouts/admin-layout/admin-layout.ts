import { Component, input, output, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar, SidebarNavItem, SidebarSection, SidebarUser } from '../../shared/components/sidebar/sidebar';
import { BreadcrumbItem, Topbar } from '../../shared/components/topbar/topbar';

@Component({
  selector: 'app-admin-layout',
  imports: [Sidebar, Topbar, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  readonly title = input<string>('IoT Waste Operations');
  readonly breadcrumbs = input<BreadcrumbItem[]>([
    { label: 'Admin' },
    { label: 'Dashboard' },
  ]);
  readonly activeNavId = input<string>('dashboard');
  readonly unreadNotifications = input<number>(4);

  readonly navSections = input<SidebarSection[]>([
    {
      title: 'Monitoring',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'map', label: 'Live Bin Map', icon: 'map', badge: '12', badgeVariant: 'warning' },
        { id: 'analytics', label: 'Waste Analytics', icon: 'chart' },
      ],
    },
    {
      title: 'Fleet & IoT',
      items: [
        { id: 'bins', label: 'Smart Bins', icon: 'recycle', badge: '148', badgeVariant: 'neutral' },
        { id: 'trucks', label: 'Collection Trucks', icon: 'truck' },
        { id: 'sensors', label: 'Sensor Network', icon: 'wifi' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Team & Operators', icon: 'users' },
        { id: 'settings', label: 'Platform Settings', icon: 'settings' },
      ],
    },
  ]);

  readonly currentUser = input<SidebarUser>({
    name: 'Sarah Connor',
    email: 'operations@smartrecycle.io',
    role: 'Operations Lead',
  });

  readonly navItemClicked = output<SidebarNavItem>();
  readonly searchTriggered = output<string>();

  readonly sidebarCollapsed = signal<boolean>(false);
  readonly mobileSidebarOpen = signal<boolean>(false);

  toggleCollapse(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  handleNavItem(item: SidebarNavItem): void {
    this.closeMobileSidebar();
    this.navItemClicked.emit(item);
  }
}
