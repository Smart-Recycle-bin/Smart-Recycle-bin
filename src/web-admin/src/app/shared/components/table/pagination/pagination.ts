import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '@shared/components/icon/icon';

@Component({
  selector: 'app-pagination',
  imports: [Icon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly total = input<number | null>(0);
  readonly currentCount = input<number | null>(null);
  readonly disabled = input<boolean>(false);

  readonly pageChange = output<number>();

  readonly safePageSize = computed(() => Math.max(1, this.pageSize()));

  readonly isTotalKnown = computed(() => this.total() !== null);

  readonly totalPages = computed<number | null>(() => {
    const t = this.total();
    if (t === null) return null;
    if (t <= 0) return 1;
    return Math.ceil(t / this.safePageSize());
  });

  readonly currentPage = computed(() => {
    const p = Math.max(1, this.page());
    const tp = this.totalPages();
    return tp === null ? p : Math.min(p, tp);
  });

  readonly startItem = computed(() => {
    const t = this.total();
    if (t !== null && t <= 0) return 0;
    const count = this.currentCount();
    if (t === null && count === 0) return 0;
    return (this.currentPage() - 1) * this.safePageSize() + 1;
  });

  readonly endItem = computed(() => {
    const t = this.total();
    if (t !== null) {
      if (t <= 0) return 0;
      return Math.min(this.currentPage() * this.safePageSize(), t);
    }
    const count = this.currentCount();
    if (count === null) {
      return this.currentPage() * this.safePageSize();
    }
    if (count === 0) return 0;
    return this.startItem() + count - 1;
  });

  readonly canPrev = computed(() => !this.disabled() && this.currentPage() > 1);

  readonly canNext = computed(() => {
    if (this.disabled()) return false;
    const tp = this.totalPages();
    if (tp !== null) {
      const t = this.total() ?? 0;
      return t > 0 && this.currentPage() < tp;
    }
    // Unknown total: do not pretend there is only 1 page
    const count = this.currentCount();
    return count === null ? true : count >= this.safePageSize();
  });

  goToPrev(): void {
    if (!this.canPrev()) return;
    this.pageChange.emit(this.currentPage() - 1);
  }

  goToNext(): void {
    if (!this.canNext()) return;
    this.pageChange.emit(this.currentPage() + 1);
  }
}
