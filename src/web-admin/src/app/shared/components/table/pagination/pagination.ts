import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../icon/icon';

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
  readonly total = input<number>(0);

  readonly pageChange = output<number>();

  readonly safePageSize = computed(() => Math.max(1, this.pageSize()));

  readonly totalPages = computed(() => {
    const t = this.total();
    if (t <= 0) return 1;
    return Math.ceil(t / this.safePageSize());
  });

  readonly currentPage = computed(() => {
    return Math.min(Math.max(1, this.page()), this.totalPages());
  });

  readonly startItem = computed(() => {
    if (this.total() <= 0) return 0;
    return (this.currentPage() - 1) * this.safePageSize() + 1;
  });

  readonly endItem = computed(() => {
    if (this.total() <= 0) return 0;
    return Math.min(this.currentPage() * this.safePageSize(), this.total());
  });

  readonly canPrev = computed(() => this.currentPage() > 1);
  readonly canNext = computed(() => this.total() > 0 && this.currentPage() < this.totalPages());

  goToPrev(): void {
    if (!this.canPrev()) return;
    this.pageChange.emit(this.currentPage() - 1);
  }

  goToNext(): void {
    if (!this.canNext()) return;
    this.pageChange.emit(this.currentPage() + 1);
  }
}
