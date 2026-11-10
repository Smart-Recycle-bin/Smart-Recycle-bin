import { Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '../../icon/icon';
import { Badge } from '../../badge/badge';
import { IconButton } from '../../button/icon-button/icon-button';
import { Checkbox } from '../../form/checkbox/checkbox';
import { Skeleton } from '../../skeleton/skeleton';
import { EmptyState } from '../../empty-state/empty-state';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'badge' | 'number' | 'date';
}

export interface TableAction {
  id: string;
  icon: string;
  label: string;
  variant?: 'ghost' | 'primary' | 'danger';
}

export type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-data-table',
  imports: [Icon, Badge, IconButton, Checkbox, Skeleton, EmptyState],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class DataTable {
  readonly columns = input.required<TableColumn[]>();
  readonly data = input.required<Record<string, any>[]>();
  readonly selectable = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly actions = input<TableAction[]>([]);
  readonly emptyTitle = input<string>('No records found');
  readonly emptyDescription = input<string>('There are no items to show in this view.');

  readonly sortColumn = signal<string | null>(null);
  readonly sortDir = signal<SortDirection>(null);
  readonly selectedIds = signal<Set<string | number>>(new Set());

  readonly rowSelected = output<Record<string, any>[]>();
  readonly actionClicked = output<{ action: string; row: Record<string, any> }>();

  readonly sortedData = computed(() => {
    const rows = [...this.data()];
    const col = this.sortColumn();
    const dir = this.sortDir();

    if (!col || !dir) return rows;

    return rows.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return dir === 'asc' ? comparison : -comparison;
    });
  });

  readonly allSelected = computed(() => {
    const list = this.data();
    if (!list.length) return false;
    const selected = this.selectedIds();
    return list.every((item, index) => selected.has(item['id'] ?? index));
  });

  readonly isIndeterminate = computed(() => {
    const selectedCount = this.selectedIds().size;
    const totalCount = this.data().length;
    return selectedCount > 0 && selectedCount < totalCount;
  });

  handleSort(col: TableColumn): void {
    if (!col.sortable) return;

    if (this.sortColumn() !== col.key) {
      this.sortColumn.set(col.key);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else {
      this.sortColumn.set(null);
      this.sortDir.set(null);
    }
  }

  toggleSelectAll(checked: boolean): void {
    const newSet = new Set<string | number>();
    if (checked) {
      this.data().forEach((item, index) => {
        newSet.add(item['id'] ?? index);
      });
    }
    this.selectedIds.set(newSet);
    this.emitSelection();
  }

  toggleSelectRow(row: Record<string, any>, index: number): void {
    const key = row['id'] ?? index;
    const newSet = new Set(this.selectedIds());
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    this.selectedIds.set(newSet);
    this.emitSelection();
  }

  isRowSelected(row: Record<string, any>, index: number): boolean {
    const key = row['id'] ?? index;
    return this.selectedIds().has(key);
  }

  private emitSelection(): void {
    const selected = this.selectedIds();
    const rows = this.data().filter((item, index) => selected.has(item['id'] ?? index));
    this.rowSelected.emit(rows);
  }

  handleAction(actionId: string, row: Record<string, any>): void {
    this.actionClicked.emit({ action: actionId, row });
  }

  getBadgeVariant(val: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const lower = String(val).toLowerCase();
    if (lower.includes('active') || lower.includes('success') || lower.includes('online') || lower.includes('optimal') || lower.includes('high')) {
      return 'success';
    }
    if (lower.includes('warning') || lower.includes('pending') || lower.includes('medium') || lower.includes('busy')) {
      return 'warning';
    }
    if (lower.includes('danger') || lower.includes('full') || lower.includes('critical') || lower.includes('offline') || lower.includes('error')) {
      return 'danger';
    }
    if (lower.includes('info') || lower.includes('processing')) {
      return 'info';
    }
    return 'neutral';
  }
}
