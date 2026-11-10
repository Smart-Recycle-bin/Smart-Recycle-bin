import { Component, computed, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: IconName | string;
  badge?: string | number;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  route?: string;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

export interface SidebarUser {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [Icon, Avatar, Badge],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly appName = input<string>('SmartRecycle');
  readonly appSubtitle = input<string>('IoT Waste OS');
  readonly sections = input<SidebarSection[]>([]);
  readonly activeId = input<string>('dashboard');
  readonly collapsed = input<boolean>(false);
  readonly user = input<SidebarUser>({
    name: 'Sarah Connor',
    email: 'sarah@smartrecycle.io',
    role: 'Operations Director',
  });

  readonly itemClicked = output<SidebarNavItem>();
  readonly toggleCollapse = output<void>();
  readonly logoutClicked = output<void>();

  handleItemClick(item: SidebarNavItem): void {
    this.itemClicked.emit(item);
  }

  handleToggleCollapse(): void {
    this.toggleCollapse.emit();
  }

  handleLogout(): void {
    this.logoutClicked.emit();
  }
}
