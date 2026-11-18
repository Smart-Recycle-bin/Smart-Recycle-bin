import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuditLogService } from '@services/audit/audit-log.service';
import { LookupsService } from '@services/lookup/lookups.service';
import {
  AuditLogQuery,
  AuditLogRow,
} from '@models/audit/audit.view-model';
import {
  AuditActionType,
  AUDIT_ACTION_TYPE_LABELS,
} from '@models/audit/audit-action-type.enum';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Notice } from '@shared/components/notice/notice';
import { Button } from '@shared/components/button/button';
import { Badge, BadgeVariant } from '@shared/components/badge/badge';
import { Select, SelectOption } from '@shared/components/form/select/select';
import { Input } from '@shared/components/form/input/input';
import {
  DateRangeInput,
  DateRangeValue,
} from '@shared/components/form/date-range-input/date-range-input';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { MonoIdCell } from '@shared/components/table/cells/mono-id-cell/mono-id-cell';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { TooltipDirective } from '@shared/components/tooltip/tooltip.directive';
import { DateTimePipe } from '@shared/pipes';
import { createPagedList } from '@shared/utils/paged-list';
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
    DateTimePipe,
  ],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogs {
  private readonly auditLogService = inject(AuditLogService);
  private readonly lookupsService = inject(LookupsService);

  readonly columns = AUDIT_TABLE_COLUMNS;
  readonly actionTypeFilterOptions = ACTION_TYPE_FILTER_OPTIONS;

  readonly pagedList = createPagedList<AuditLogRow, AuditLogQuery>({
    fetch: (query) => this.auditLogService.getAuditLogs(query),
    initial: {
      pageSize: 8,
      sortBy: 'timestamp',
      sortDir: 'desc',
    },
    debounceKeys: ['resourceId'],
    debounceMs: 300,
  });

  // Backward compatible delegates for template and tests
  readonly auditLogs = this.pagedList.items;
  readonly isLoading = this.pagedList.loading;
  readonly error = this.pagedList.error;

  // Admin options from LookupsService
  readonly adminOptions = toSignal(
    this.lookupsService.getAdmins().pipe(
      map((admins): SelectOption[] => [
        { label: 'All admins', value: '' },
        ...admins.map((a) => ({
          label: `${a.adminId} · ${a.displayName}`,
          value: a.adminId,
        })),
      ])
    ),
    { initialValue: [{ label: 'All admins', value: '' }] as SelectOption[] }
  );

  handleAdminChange(adminId: string | number): void {
    this.pagedList.patchFilters({ adminId: adminId ? String(adminId) : undefined });
  }

  handleActionChange(action: string | number): void {
    this.pagedList.patchFilters({ actionType: action ? (action as AuditActionType) : undefined });
  }

  handleResourceIdChange(resourceId: string): void {
    this.pagedList.patchFilters({ resourceId: resourceId || undefined });
  }

  handleDateRangeChange(range: DateRangeValue): void {
    if (range.from && range.to && range.from > range.to) {
      return;
    }
    this.pagedList.patchFilters({
      from: range.from || undefined,
      to: range.to || undefined,
    });
  }

  loadAuditLogs(): void {
    this.pagedList.reload();
  }

  getActionBadgeVariant(action: AuditActionType): BadgeVariant {
    return AUDIT_ACTION_BADGE_VARIANTS[action] ?? 'neutral';
  }

  getActionLabel(action: AuditActionType): string {
    return AUDIT_ACTION_TYPE_LABELS[action] ?? action;
  }

  readonly getRowId = (row: AuditLogRow): string => row.auditId;
}
