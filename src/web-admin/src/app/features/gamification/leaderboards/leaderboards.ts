import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LeaderboardService } from '@services/gamification/leaderboard.service';
import {
  LeaderboardQuery,
  LeaderboardRow,
  MilestoneBadge,
} from '@models/gamification/gamification.view-model';
import { LeaderboardScope } from '@models/gamification/leaderboard-scope.enum';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Badge } from '@shared/components/badge/badge';
import { Tabs } from '@shared/components/tabs/tabs';
import { Card } from '@shared/components/card/card';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { Icon } from '@shared/components/icon/icon';
import { createPagedList } from '@shared/utils/paged-list';
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

  // Paged list infrastructure
  readonly pagedList = createPagedList<LeaderboardRow, LeaderboardQuery>({
    fetch: (query) => this.leaderboardService.getLeaderboard(query),
    initial: {
      filters: { scope: LeaderboardScope.Weekly },
    },
  });

  // Active Scope ('weekly' | 'monthly' | 'all-time')
  readonly activeScope = computed(() => this.pagedList.filters().scope ?? LeaderboardScope.Weekly);

  // Leaderboard Rankings State (delegates to pagedList)
  readonly leaderboardRows = this.pagedList.items;
  readonly isLoadingLeaderboard = this.pagedList.loading;
  readonly leaderboardError = this.pagedList.error;

  // Milestone Badges State (independent loading/error per prompt instructions)
  readonly milestoneBadges = signal<MilestoneBadge[]>([]);
  readonly isLoadingBadges = signal<boolean>(true);
  readonly badgesError = signal<unknown>(null);

  ngOnInit(): void {
    this.loadBadges();
  }

  loadLeaderboard(scope?: LeaderboardScope): void {
    if (scope) {
      this.pagedList.patchFilters({ scope });
    } else {
      this.pagedList.reload();
    }
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
    this.pagedList.patchFilters({ scope });
  }

  readonly getRowId = (row: LeaderboardRow): string => row.userId;
}
