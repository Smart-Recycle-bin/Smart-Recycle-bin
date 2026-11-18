import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';
import { BrandLogo } from '../brand-logo/brand-logo';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: IconName | string;
  route: string;
  exact?: boolean;
  badge?: string | number;
}

export interface SidebarSection {
  title?: string;
  items: SidebarNavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon, BrandLogo],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly sections = input<SidebarSection[]>([]);
  readonly collapsed = input<boolean>(false);
  readonly logoSrc = input<string>('ecobin-logo.svg');
  readonly logoAlt = input<string>('EcoBin');

  readonly toggleCollapse = output<void>();
  readonly linkClicked = output<SidebarNavItem>();

  handleToggleCollapse(): void {
    this.toggleCollapse.emit();
  }

  handleLinkClick(item: SidebarNavItem): void {
    this.linkClicked.emit(item);
  }
}
