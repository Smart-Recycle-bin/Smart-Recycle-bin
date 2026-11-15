import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeaderboardService } from '../../../core/services/gamification/leaderboard.service';
import {
  LeaderboardRow,
  MilestoneBadge,
} from '../../../core/models/gamification/gamification.view-model';
import { LeaderboardScope } from '../../../core/models/gamification/leaderboard-scope.enum';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Badge } from '../../../shared/components/badge/badge';
import { Tabs } from '../../../shared/components/tabs/tabs';
import { Card } from '../../../shared/components/card/card';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { Icon } from '../../../shared/components/icon/icon';
import {
  getRankBadgeClass,
  LEADERBOARD_TABLE_COLUMNS,
  LEADERBOARD_TABS,
} from './leaderboards.config';

@Component({
  selector: 'app-leaderboards',
  imports: [
    DecimalPipe,
    NgClass,
    PageHeader,
    Badge,
    Tabs,
    Card,
    DataTable,
    CellTemplateDirective,
    UserCell,
    ResourceState,
    Skeleton,
    Icon,
  ],
  templateUrl: './leaderboards.html',
  styleUrl: './leaderboards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leaderboards implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs = LEADERBOARD_TABS;
  readonly columns = LEADERBOARD_TABLE_COLUMNS;
  readonly getRankClass = getRankBadgeClass;

  // Active Scope ('weekly' | 'monthly' | 'all-time')
  readonly activeScope = signal<LeaderboardScope>(LeaderboardScope.Weekly);

  // Leaderboard Rankings State
  readonly leaderboardRows = signal<LeaderboardRow[]>([]);
  readonly isLoadingLeaderboard = signal<boolean>(true);
  readonly leaderboardError = signal<unknown>(null);

  // Milestone Badges State (independent loading/error per prompt instructions)
  readonly milestoneBadges = signal<MilestoneBadge[]>([]);
  readonly isLoadingBadges = signal<boolean>(true);
  readonly badgesError = signal<unknown>(null);

  ngOnInit(): void {
    this.loadLeaderboard(this.activeScope());
    this.loadBadges();
  }

  loadLeaderboard(scope?: LeaderboardScope): void {
    const targetScope = scope ?? this.activeScope();
    this.isLoadingLeaderboard.set(true);
    this.leaderboardError.set(null);

    this.leaderboardService
      .getLeaderboard({ scope: targetScope })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.leaderboardRows.set(rows);
          this.isLoadingLeaderboard.set(false);
        },
        error: (err) => {
          this.leaderboardError.set(err);
          this.isLoadingLeaderboard.set(false);
        },
      });
  }

  loadBadges(): void {
    this.isLoadingBadges.set(true);
    this.badgesError.set(null);

    this.leaderboardService
      .getMilestoneBadges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (badges) => {
          this.milestoneBadges.set(badges);
          this.isLoadingBadges.set(false);
        },
        error: (err) => {
          this.badgesError.set(err);
          this.isLoadingBadges.set(false);
        },
      });
  }

  handleTabChange(tabId: string): void {
    const scope = tabId as LeaderboardScope;
    this.activeScope.set(scope);
    this.loadLeaderboard(scope);
  }

  readonly getRowId = (row: LeaderboardRow): string => row.userId;
}
