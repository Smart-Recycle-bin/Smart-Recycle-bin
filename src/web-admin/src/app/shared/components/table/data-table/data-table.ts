import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChildren,
  effect,
  input,
  isDevMode,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { Icon } from '@shared/components/icon/icon';
import { Badge, BadgeVariant } from '@shared/components/badge/badge';
import { IconButton } from '@shared/components/button/icon-button/icon-button';
import { Checkbox } from '@shared/components/form/checkbox/checkbox';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { Pagination } from '../pagination/pagination';
import { CellTemplateContext, CellTemplateDirective } from './cell-template.directive';

export type TableColumnKey<T> = (keyof T & string) | (string & {});

export interface TableColumn<T = unknown> {
  key: TableColumnKey<T>;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'badge' | 'number' | 'date';
  nowrap?: boolean;
  badgeVariant?: ((row: T) => BadgeVariant) | Record<string, BadgeVariant>;
  value?: (row: T) => unknown;
}

export interface TableAction<T = unknown> {
  id: string;
  icon: string;
  label: string;
  ariaLabel?: string | ((row: T) => string);
  variant?: 'ghost' | 'primary' | 'danger';
  disabled?: (row: T) => boolean;
  visible?: (row: T) => boolean;
}

export type SortDirection = 'asc' | 'desc' | null;
export type TableMode = 'client' | 'server';

export interface TableSort {
  key: string | null;
  dir: SortDirection;
}

@Component({
  selector: 'app-data-table',
  imports: [
    NgTemplateOutlet,
    Icon,
    Badge,
    IconButton,
    Checkbox,
    Skeleton,
    EmptyState,
    Pagination,
  ],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T = unknown> {
  readonly columns = input.required<TableColumn<T>[]>();
  readonly data = input.required<T[]>();
  readonly mode = input<TableMode>('client');
  readonly selectable = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly actions = input<TableAction<T>[]>([]);
  readonly actionsLabel = input<string>('Actions');
  readonly ariaLabel = input<string>('Data table');
  readonly stickyHeader = input<boolean>(false);
  readonly showPagination = input<boolean>(true);
  readonly page = input<number>(1);
  readonly pageSize = input<number>(10);
  readonly total = input<number | null>(null);
  readonly sortColumn = input<string | null>(null);
  readonly sortDir = input<SortDirection>(null);
  readonly rowId = input<((row: T) => string | number) | undefined>(undefined);
  readonly rowClickable = input<boolean>(false);
  readonly emptyTitle = input<string>('No records found');
  readonly emptyDescription = input<string>('There are no items to show in this view.');

  readonly rowSelected = output<T[]>();
  readonly actionClicked = output<{ action: string; row: T }>();
  readonly rowClick = output<T>();
  readonly sortChange = output<TableSort>();
  readonly pageChange = output<number>();

  readonly cellTemplates = contentChildren(CellTemplateDirective);

  readonly internalSortColumn = linkedSignal(() => this.sortColumn());
  readonly internalSortDir = linkedSignal(() => this.sortDir());
  readonly internalPage = linkedSignal(() => this.page());
  readonly selectedRowsMap = signal<Map<string | number, T>>(new Map());
  readonly selectedIds = computed(() => new Set(this.selectedRowsMap().keys()));

  private readonly fallbackObjectKeys = new WeakMap<object, string>();
  private fallbackKeyCounter = 0;
  private prevDataLength: number | null = null;
  private warnedMissingRowId = false;
  private warnedMissingServerTotal = false;

  constructor() {
    effect(() => {
      const rows = this.data();
      const len = rows.length;
      if (this.mode() === 'client' && this.prevDataLength !== null && len !== this.prevDataLength) {
        this.internalPage.set(1);
      }
      this.prevDataLength = len;
    });

    effect(() => {
      if (!isDevMode()) return;

      if (this.mode() === 'server' && this.total() === null && !this.warnedMissingServerTotal) {
        this.warnedMissingServerTotal = true;
        console.warn('DataTable: mode="server" requires [total] to be provided.');
      }

      if (this.selectable() && !this.rowId() && !this.warnedMissingRowId) {
        const rows = this.data();
        const missingId = rows.some((row) => this.extractRowIdProp(row) === undefined);
        if (missingId) {
          this.warnedMissingRowId = true;
          console.warn('DataTable: [rowId] must be provided when [selectable] is true and rows lack an id property.');
        }
      }
    });
  }

  readonly templateMap = computed(() => {
    const map = new Map<string, TemplateRef<CellTemplateContext<T>>>();
    for (const tpl of this.cellTemplates()) {
      map.set(tpl.appCell(), tpl.templateRef as TemplateRef<CellTemplateContext<T>>);
    }
    return map;
  });

  readonly totalCount = computed<number | null>(() => {
    const t = this.total();
    if (this.mode() === 'server') {
      return t;
    }
    return t !== null ? t : this.data().length;
  });

  readonly sortedData = computed<T[]>(() => {
    const rows = this.data();
    if (this.mode() === 'server') {
      return rows;
    }

    const colKey = this.internalSortColumn();
    const dir = this.internalSortDir();
    if (!colKey || !dir) return rows;

    const col = this.columns().find((c) => c.key === colKey);
    const copy = [...rows];
    return copy.sort((a, b) => {
      const valA = col ? this.getCellValue(a, col) : (a as Record<string, unknown>)[colKey];
      const valB = col ? this.getCellValue(b, col) : (b as Record<string, unknown>)[colKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const comparison =
        typeof valA === 'number' && typeof valB === 'number'
          ? valA - valB
          : String(valA).localeCompare(String(valB), undefined, {
              numeric: true,
              sensitivity: 'base',
            });

      return dir === 'asc' ? comparison : -comparison;
    });
  });

  readonly displayData = computed<T[]>(() => {
    const rows = this.sortedData();
    if (this.mode() === 'server' || !this.showPagination()) {
      return rows;
    }
    const size = Math.max(1, this.pageSize());
    const maxPage = Math.max(1, Math.ceil(rows.length / size));
    const current = Math.min(Math.max(1, this.internalPage()), maxPage);
    const start = (current - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly allSelected = computed(() => {
    const visible = this.displayData();
    if (!visible.length) return false;
    const selected = this.selectedRowsMap();
    return visible.every((row) => selected.has(this.getRowKey(row)));
  });

  readonly isIndeterminate = computed(() => {
    const visible = this.displayData();
    if (!visible.length) return false;
    const selected = this.selectedRowsMap();
    const selectedVisibleCount = visible.filter((row) => selected.has(this.getRowKey(row))).length;
    return selectedVisibleCount > 0 && selectedVisibleCount < visible.length;
  });

  readonly columnCount = computed(() => {
    return (
      this.columns().length +
      (this.selectable() ? 1 : 0) +
      (this.actions().length > 0 ? 1 : 0)
    );
  });

  getRowKey(row: T): string | number {
    const customRowId = this.rowId();
    if (customRowId) {
      return customRowId(row);
    }

    const extracted = this.extractRowIdProp(row);
    if (extracted !== undefined) {
      return extracted;
    }

    if (row && typeof row === 'object') {
      let existing = this.fallbackObjectKeys.get(row);
      if (!existing) {
        existing = `__row_${++this.fallbackKeyCounter}`;
        this.fallbackObjectKeys.set(row, existing);
      }
      return existing;
    }

    return String(row);
  }

  getCellValue(row: T, col: TableColumn<T>): unknown {
    if (col.value) {
      return col.value(row);
    }
    if (row && typeof row === 'object') {
      return (row as Record<string, unknown>)[col.key];
    }
    return undefined;
  }

  resolveBadgeVariant(col: TableColumn<T>, row: T): BadgeVariant {
    const mapper = col.badgeVariant;
    if (typeof mapper === 'function') {
      return mapper(row);
    }
    if (mapper && typeof mapper === 'object') {
      const raw = String(this.getCellValue(row, col) ?? '');
      return mapper[raw] ?? 'neutral';
    }
    return 'neutral';
  }

  resolveActionAriaLabel(act: TableAction<T>, row: T): string {
    if (act.ariaLabel) {
      if (typeof act.ariaLabel === 'function') {
        return act.ariaLabel(row);
      }
      return act.ariaLabel;
    }
    const anyRow = row as Record<string, unknown>;
    const rowContext =
      anyRow['name'] ||
      anyRow['displayName'] ||
      anyRow['title'] ||
      anyRow['deviceSerial'] ||
      anyRow['serialNumber'] ||
      anyRow['reportId'] ||
      anyRow['userId'] ||
      anyRow['id'];
    if (rowContext) {
      return `${act.label} ${rowContext}`;
    }
    return act.label;
  }

  getAriaSort(col: TableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (!col.sortable) return null;
    if (this.internalSortColumn() !== col.key || !this.internalSortDir()) {
      return 'none';
    }
    return this.internalSortDir() === 'asc' ? 'ascending' : 'descending';
  }

  handleSort(col: TableColumn<T>): void {
    if (!col.sortable) return;

    let nextCol: string | null = col.key;
    let nextDir: SortDirection = 'asc';

    if (this.internalSortColumn() === col.key) {
      if (this.internalSortDir() === 'asc') {
        nextDir = 'desc';
      } else if (this.internalSortDir() === 'desc') {
        nextCol = null;
        nextDir = null;
      }
    }

    this.internalSortColumn.set(nextCol);
    this.internalSortDir.set(nextDir);

    if (this.mode() === 'client') {
      this.internalPage.set(1);
    }

    this.sortChange.emit({ key: nextCol, dir: nextDir });
  }

  handleSortKeyDown(event: KeyboardEvent, col: TableColumn<T>): void {
    if (!col.sortable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleSort(col);
    }
  }

  handlePageChange(nextPage: number): void {
    this.internalPage.set(nextPage);
    this.pageChange.emit(nextPage);
  }

  toggleSelectAll(checked: boolean): void {
    const nextMap = new Map(this.selectedRowsMap());
    for (const item of this.displayData()) {
      const key = this.getRowKey(item);
      if (checked) {
        nextMap.set(key, item);
      } else {
        nextMap.delete(key);
      }
    }
    this.selectedRowsMap.set(nextMap);
    this.emitSelection();
  }

  toggleSelectRow(row: T): void {
    const key = this.getRowKey(row);
    const nextMap = new Map(this.selectedRowsMap());
    if (nextMap.has(key)) {
      nextMap.delete(key);
    } else {
      nextMap.set(key, row);
    }
    this.selectedRowsMap.set(nextMap);
    this.emitSelection();
  }

  isRowSelected(row: T): boolean {
    return this.selectedRowsMap().has(this.getRowKey(row));
  }

  clearSelection(): void {
    this.selectedRowsMap.set(new Map());
    this.rowSelected.emit([]);
  }

  handleRowClick(row: T): void {
    if (!this.rowClickable()) return;
    this.rowClick.emit(row);
  }

  handleRowKeyDown(event: KeyboardEvent, row: T): void {
    if (!this.rowClickable()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.rowClick.emit(row);
    }
  }

  handleAction(actionId: string, row: T): void {
    this.actionClicked.emit({ action: actionId, row });
  }

  isActionVisible(act: TableAction<T>, row: T): boolean {
    return act.visible ? act.visible(row) : true;
  }

  isActionDisabled(act: TableAction<T>, row: T): boolean {
    return act.disabled ? act.disabled(row) : false;
  }

  private extractRowIdProp(row: T): string | number | undefined {
    if (row && typeof row === 'object' && 'id' in row) {
      const id = (row as { id?: unknown }).id;
      if (typeof id === 'string' || typeof id === 'number') {
        return id;
      }
    }
    return undefined;
  }

  private emitSelection(): void {
    this.rowSelected.emit(Array.from(this.selectedRowsMap().values()));
  }
}
