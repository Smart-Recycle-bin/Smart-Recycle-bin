import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditLogService } from '../../../core/services/audit/audit-log.service';
import {
  AuditLogQuery,
  AuditLogRow,
} from '../../../core/models/audit/audit.view-model';
import {
  AuditActionType,
  AUDIT_ACTION_TYPE_LABELS,
} from '../../../core/models/audit/audit-action-type.enum';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Notice } from '../../../shared/components/notice/notice';
import { Button } from '../../../shared/components/button/button';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { Input } from '../../../shared/components/form/input/input';
import {
  DateRangeInput,
  DateRangeValue,
} from '../../../shared/components/form/date-range-input/date-range-input';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { MonoIdCell } from '../../../shared/components/table/cells/mono-id-cell/mono-id-cell';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { TooltipDirective } from '../../../shared/components/tooltip/tooltip.directive';
import {
  ACTION_TYPE_FILTER_OPTIONS,
  AUDIT_ACTION_BADGE_VARIANTS,
  AUDIT_TABLE_COLUMNS,
} from './audit-logs.config';

@Component({
  selector: 'app-audit-logs',
  imports: [
    PageHeader,
    Notice,
    Button,
    Badge,
    Select,
    Input,
    DateRangeInput,
    DataTable,
    CellTemplateDirective,
    UserCell,
    MonoIdCell,
    ResourceState,
    Skeleton,
    TooltipDirective,
  ],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogs implements OnInit {
  private readonly auditLogService = inject(AuditLogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns = AUDIT_TABLE_COLUMNS;
  readonly actionTypeFilterOptions = ACTION_TYPE_FILTER_OPTIONS;

  readonly auditLogs = signal<AuditLogRow[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  // Filters
  readonly selectedAdminId = signal<string>('');
  readonly selectedActionType = signal<AuditActionType | ''>('');
  readonly resourceIdFilter = signal<string>('');
  readonly dateRange = signal<DateRangeValue>({ from: null, to: null });

  // Admin select options derived from initial unfiltered load so choosing an admin does not shrink the options
  readonly adminOptions = signal<SelectOption[]>([{ label: 'All admins', value: '' }]);
  private hasPopulatedAdminOptions = false;

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const query: AuditLogQuery = {};

    if (this.selectedAdminId()) {
      query.adminId = this.selectedAdminId();
    }

    if (this.selectedActionType()) {
      query.actionType = this.selectedActionType() as AuditActionType;
    }

    const resId = this.resourceIdFilter().trim();
    if (resId) {
      query.resourceId = resId;
    }

    const range = this.dateRange();
    if (range.from) {
      query.from = range.from;
    }
    if (range.to) {
      query.to = range.to;
    }

    this.auditLogService
      .getAuditLogs(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.auditLogs.set(rows);
          this.isLoading.set(false);

          // Populate admin filter options once from unfiltered dataset so selection stays stable
          if (!this.hasPopulatedAdminOptions && Object.keys(query).length === 0) {
            this.populateAdminOptions(rows);
            this.hasPopulatedAdminOptions = true;
          }
        },
        error: (err) => {
          this.error.set(err);
          this.isLoading.set(false);
        },
      });
  }

  private populateAdminOptions(rows: AuditLogRow[]): void {
    const adminMap = new Map<string, string>();
    for (const r of rows) {
      if (!adminMap.has(r.adminId)) {
        adminMap.set(r.adminId, `${r.adminId} · ${r.adminName}`);
      }
    }

    const options: SelectOption[] = [
      { label: 'All admins', value: '' },
      ...Array.from(adminMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];

    this.adminOptions.set(options);
  }

  handleAdminChange(adminId: string | number): void {
    this.selectedAdminId.set(String(adminId));
    this.loadAuditLogs();
  }

  handleActionChange(action: string | number): void {
    this.selectedActionType.set((action || '') as AuditActionType | '');
    this.loadAuditLogs();
  }

  handleResourceIdChange(resourceId: string): void {
    this.resourceIdFilter.set(resourceId);
    this.loadAuditLogs();
  }

  handleDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.loadAuditLogs();
  }

  getActionBadgeVariant(action: AuditActionType): BadgeVariant {
    return AUDIT_ACTION_BADGE_VARIANTS[action] ?? 'neutral';
  }

  getActionLabel(action: AuditActionType): string {
    return AUDIT_ACTION_TYPE_LABELS[action] ?? action;
  }

  readonly getRowId = (row: AuditLogRow): string => row.auditId;
}
