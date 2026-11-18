import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectorAssignedBin, CollectorListItem } from '@models/collector/collector.view-model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { AccountStatus } from '@models/user/account-status.enum';
import { Drawer } from '@shared/components/overlay/drawer/drawer';
import { Avatar } from '@shared/components/avatar/avatar';
import { Badge, BadgeVariant } from '@shared/components/badge/badge';
import { Button } from '@shared/components/button/button';
import { FillLevelCell } from '@shared/components/table/cells/fill-level-cell/fill-level-cell';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ErrorState } from '@shared/components/error-state/error-state';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { Icon } from '@shared/components/icon/icon';
import { formatDateTime } from '@shared/utils/datetime';

export interface BinsSummary {
  total: number;
  needAttention: number;
  offline: number;
  avgFill: number;
}

@Component({
  selector: 'app-assigned-bins-drawer',
  standalone: true,
  imports: [
    CommonModule,
    Drawer,
    Avatar,
    Badge,
    Button,
    FillLevelCell,
    EmptyState,
    ErrorState,
    Skeleton,
    Icon,
  ],
  templateUrl: './assigned-bins-drawer.html',
  styleUrl: './assigned-bins-drawer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssignedBinsDrawer {
  readonly open = input<boolean>(false);
  readonly collector = input<CollectorListItem | null>(null);
  readonly bins = input<CollectorAssignedBin[]>([]);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);

  readonly closed = output<void>();
  readonly retry = output<void>();
  readonly assignBin = output<void>();

  /**
   * Sorts bins worst-first: highest fill level first, then alphabetical by name.
   */
  readonly sortedBins = computed<CollectorAssignedBin[]>(() => {
    const list = [...this.bins()];
    return list.sort((a, b) => {
      if (b.fillLevel !== a.fillLevel) {
        return b.fillLevel - a.fillLevel;
      }
      return a.name.localeCompare(b.name);
    });
  });

  /**
   * Derived statistical summary strip across all assigned smart bins.
   */
  readonly summary = computed<BinsSummary>(() => {
    const list = this.bins();
    const total = list.length;
    if (total === 0) {
      return { total: 0, needAttention: 0, offline: 0, avgFill: 0 };
    }

    let needAttention = 0;
    let offline = 0;
    let totalFill = 0;

    for (const bin of list) {
      totalFill += bin.fillLevel;
      if (
        bin.fillLevel >= 80 ||
        bin.status === BinStatus.NeedsServicing ||
        bin.status === BinStatus.EightyPercentFull
      ) {
        needAttention++;
      }
      if (bin.status === BinStatus.Offline) {
        offline++;
      }
    }

    return {
      total,
      needAttention,
      offline,
      avgFill: Math.round(totalFill / total),
    };
  });

  getCollectorBadgeVariant(status: AccountStatus | undefined): BadgeVariant {
    return status === AccountStatus.Active ? 'success' : 'neutral';
  }

  getBinBadgeVariant(status: BinStatus): BadgeVariant {
    switch (status) {
      case BinStatus.NeedsServicing:
        return 'danger';
      case BinStatus.EightyPercentFull:
        return 'warning';
      case BinStatus.Offline:
        return 'neutral';
      case BinStatus.Available:
      default:
        return 'success';
    }
  }

  getBinStatusLabel(status: BinStatus): string {
    switch (status) {
      case BinStatus.NeedsServicing:
        return 'Needs Servicing';
      case BinStatus.EightyPercentFull:
        return '80% Full';
      case BinStatus.Offline:
        return 'Offline';
      case BinStatus.Available:
      default:
        return 'Available';
    }
  }

  /**
   * Formats last serviced timestamp into human-readable relative time or formatted date.
   */
  formatServicedTime(isoString: string | null | undefined): string {
    if (!isoString) {
      return 'Never serviced';
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return formatDateTime(isoString);
    }

    const now = Date.now();
    const diffMs = now - date.getTime();
    if (diffMs < 0) {
      return formatDateTime(isoString);
    }

    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return formatDateTime(isoString);
  }
}
