import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';
import { LedgerRow, LedgerQuery } from '@models/wallet/ledger.view-model';
import { LedgerSource } from '@models/wallet/ledger-source.enum';
import { LedgerEntryType } from '@models/wallet/ledger-entry-type.enum';
import { ManualAdjustmentRequest } from '@models/wallet/ledger.dto';
import { LedgerService } from '@services/wallet/ledger.service';
import { RecyclersService } from '@services/user/recyclers.service';
import { ToastService } from '@services/toast/toast.service';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage, getFieldErrors } from '@core/errors/error-message';
import {
  trimmedRequired,
  maxLen,
  positiveInt,
} from '@shared/validators';
import {
  LEDGER_TABLE_COLUMNS,
  LEDGER_TYPE_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  formatSignedPoints,
  getPointsTone,
  getLedgerSourceBadgeVariant,
  getLedgerSourceLabel,
} from './ledger.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Notice } from '@shared/components/notice/notice';
import { SearchInput } from '@shared/components/form/search-input/search-input';
import { Select } from '@shared/components/form/select/select';
import { AsyncSelect } from '@shared/components/form/async-select/async-select';
import { DateRangeInput, DateRangeValue } from '@shared/components/form/date-range-input/date-range-input';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { MonoIdCell } from '@shared/components/table/cells/mono-id-cell/mono-id-cell';
import { NumberCell } from '@shared/components/table/cells/number-cell/number-cell';
import { Badge } from '@shared/components/badge/badge';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Drawer } from '@shared/components/overlay/drawer/drawer';
import { ConfirmDialog } from '@shared/components/overlay/confirm-dialog/confirm-dialog';
import { SegmentedControl } from '@shared/components/segmented-control/segmented-control';
import { Input } from '@shared/components/form/input/input';
import { NumberInput } from '@shared/components/form/number-input/number-input';
import { Textarea } from '@shared/components/form/textarea/textarea';
import { Button } from '@shared/components/button/button';
import { DateTimePipe } from '@shared/pipes';
import { createPagedList } from '@shared/utils/paged-list';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    PageHeader,
    Notice,
    SearchInput,
    Select,
    AsyncSelect,
    DateRangeInput,
    DataTable,
    CellTemplateDirective,
    UserCell,
    MonoIdCell,
    NumberCell,
    Badge,
    ResourceState,
    Drawer,
    ConfirmDialog,
    SegmentedControl,
    Input,
    NumberInput,
    Textarea,
    Button,
    DateTimePipe,
  ],
  templateUrl: './ledger.html',
  styleUrl: './ledger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ledger {
  private readonly ledgerService = inject(LedgerService);
  private readonly recyclersService = inject(RecyclersService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tableColumns = LEDGER_TABLE_COLUMNS;
  readonly typeOptions = LEDGER_TYPE_OPTIONS;
  readonly adjustmentTypeOptions = ADJUSTMENT_TYPE_OPTIONS;
  readonly formatPoints = formatSignedPoints;
  readonly getPointsTone = getPointsTone;
  readonly getSourceBadgeVariant = getLedgerSourceBadgeVariant;
  readonly getSourceLabel = getLedgerSourceLabel;

  /**
   * Paged-list infrastructure (default newest first)
   */
  readonly pagedList = createPagedList<LedgerRow, LedgerQuery>({
    fetch: (query) => this.ledgerService.getLedger(query),
    initial: {
      sortBy: 'timestamp',
      sortDir: 'desc',
    },
    debounceKeys: ['search'],
    debounceMs: 300,
  });

  readonly dateRange = signal<DateRangeValue>({ from: null, to: null });

  /**
   * Manual Adjustment Drawer state
   */
  readonly isAdjustmentDrawerOpen = signal<boolean>(false);
  readonly isConfirmDialogOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly currentIdempotencyKey = signal<string>('');
  readonly adjustmentType = signal<LedgerEntryType>(LedgerEntryType.Credit);

  readonly userServerError = signal<string>('');
  readonly amountServerError = signal<string>('');
  readonly formTouched = signal<boolean>(false);

  private readonly knownRecyclers = new Map<
    string,
    { userId: string; name: string; availablePoints: number }
  >();

  /**
   * Fetch recyclers for typeahead picker in adjustment drawer
   */
  readonly fetchRecyclers = (term: string) => {
    return this.recyclersService.getRecyclers({ search: term, pageSize: 20 }).pipe(
      map((page) => {
        page.items.forEach((r) => {
          this.knownRecyclers.set(r.userId, {
            userId: r.userId,
            name: r.name,
            availablePoints: r.availablePoints,
          });
        });
        return page.items.map((r) => ({
          label: `${r.name} · ${r.userId}`,
          value: r.userId,
        }));
      })
    );
  };

  /**
   * Form for manual points adjustment
   */
  readonly adjustmentForm = this.fb.group({
    userId: this.fb.nonNullable.control('', [trimmedRequired]),
    amount: this.fb.control<number | null>(null, [
      trimmedRequired,
      positiveInt,
      Validators.max(environment.manualAdjustmentMaxPoints),
    ]),
    reasonCode: this.fb.nonNullable.control('ADMIN_CORRECTION'),
    reasonNote: this.fb.nonNullable.control('', [trimmedRequired, maxLen(500)]),
  });

  readonly userFieldError = computed(() => {
    this.formTouched();
    const serverErr = this.userServerError();
    if (serverErr) return serverErr;
    const ctrl = this.adjustmentForm.controls.userId;
    if (!ctrl.touched && !ctrl.dirty) return '';
    if (ctrl.hasError('trimmedRequired') || ctrl.hasError('required')) return 'Target user is required';
    if (ctrl.hasError('notFound')) return 'User account not found';
    if (ctrl.hasError('serverError')) return ctrl.getError('serverError');
    return '';
  });

  readonly amountFieldError = computed(() => {
    this.formTouched();
    const serverErr = this.amountServerError();
    if (serverErr) return serverErr;
    const ctrl = this.adjustmentForm.controls.amount;
    if (!ctrl.touched && !ctrl.dirty) return '';
    if (ctrl.hasError('trimmedRequired') || ctrl.hasError('required')) return 'Adjustment amount is required';
    if (ctrl.hasError('positiveInt') || ctrl.hasError('min')) return 'Amount must be a positive integer';
    if (ctrl.hasError('max')) return `Amount cannot exceed ${environment.manualAdjustmentMaxPoints.toLocaleString()} points`;
    if (ctrl.hasError('insufficientBalance')) return 'User has insufficient available points for this debit adjustment';
    if (ctrl.hasError('serverError')) return ctrl.getError('serverError');
    return '';
  });

  readonly confirmDialogTitle = computed(() => {
    return this.adjustmentType() === LedgerEntryType.Debit
      ? 'Confirm Points Debit'
      : 'Confirm Points Credit';
  });

  readonly confirmDialogDescription = computed(() => {
    const val = this.adjustmentForm.getRawValue();
    const typeLabel = this.adjustmentType() === LedgerEntryType.Debit ? 'Debit' : 'Credit';
    const amount = val.amount ?? 0;
    const user = this.knownRecyclers.get(val.userId);
    const userInfo = user ? `${user.name} (${val.userId})` : val.userId;
    let balanceText = '';
    if (user?.availablePoints !== undefined) {
      const before = user.availablePoints;
      const after =
        this.adjustmentType() === LedgerEntryType.Debit
          ? Math.max(0, before - amount)
          : before + amount;
      balanceText = ` — balance ${before} → ${after}`;
    }
    const reason = val.reasonNote.trim() || val.reasonCode.trim() || 'No reason provided';
    return `${typeLabel} ${amount} pts — ${userInfo}${balanceText} — ${reason}`;
  });

  handleSearch(term: string): void {
    this.pagedList.patchFilters({ search: term || undefined });
  }

  handleSourceChange(source: string | number): void {
    this.pagedList.patchFilters({ source: source ? (source as LedgerSource) : undefined });
  }

  handleDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if (range.from && range.to && range.from > range.to) {
      return;
    }
    this.pagedList.patchFilters({
      from: range.from || undefined,
      to: range.to || undefined,
    });
  }

  /**
   * Manual Adjustment Drawer logic
   */
  openAdjustmentDrawer(): void {
    this.formTouched.set(false);
    this.userServerError.set('');
    this.amountServerError.set('');
    this.currentIdempotencyKey.set(crypto.randomUUID());
    this.adjustmentType.set(LedgerEntryType.Credit);
    this.adjustmentForm.reset({
      userId: '',
      amount: null,
      reasonCode: 'ADMIN_CORRECTION',
      reasonNote: '',
    });
    this.isAdjustmentDrawerOpen.set(true);
  }

  closeAdjustmentDrawer(): void {
    if (this.isSubmitting()) return;
    this.isAdjustmentDrawerOpen.set(false);
    this.isConfirmDialogOpen.set(false);
  }

  handleAdjustmentTypeChange(type: string | number): void {
    this.adjustmentType.set(type as LedgerEntryType);
    this.amountServerError.set('');
  }

  handleApplyClick(): void {
    this.formTouched.set(true);
    this.userServerError.set('');
    this.amountServerError.set('');

    if (this.adjustmentForm.invalid || this.isSubmitting()) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    this.isConfirmDialogOpen.set(true);
  }

  confirmAdjustment(): void {
    if (this.adjustmentForm.invalid || this.isSubmitting()) {
      return;
    }

    const val = this.adjustmentForm.getRawValue();
    const isDebit = this.adjustmentType() === LedgerEntryType.Debit;
    const pointsDelta = isDebit ? -Math.abs(val.amount!) : Math.abs(val.amount!);

    const req: ManualAdjustmentRequest = {
      userId: val.userId,
      amount: pointsDelta,
      type: this.adjustmentType(),
      reasonCode: val.reasonCode.trim(),
      reasonNote: val.reasonNote.trim(),
    };

    this.isSubmitting.set(true);
    this.ledgerService.adjustPoints(req, { idempotencyKey: this.currentIdempotencyKey() }).subscribe({
      next: () => {
        this.toastService.success('Manual points adjustment recorded successfully');
        this.isSubmitting.set(false);
        this.isConfirmDialogOpen.set(false);
        this.currentIdempotencyKey.set(crypto.randomUUID());
        this.closeAdjustmentDrawer();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.isConfirmDialogOpen.set(false);
        const fieldErrors = getFieldErrors(err);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, msg]) => {
            const ctrl = this.adjustmentForm.get(field);
            if (ctrl) {
              ctrl.setErrors({ serverError: msg });
              ctrl.markAsTouched();
            }
          });
        }
        if (isApiErrorCode(err, ApiErrorCode.InsufficientBalance)) {
          this.adjustmentForm.controls.amount.setErrors({ insufficientBalance: true });
          this.amountServerError.set('User has insufficient available points for this debit adjustment');
        } else if (isApiErrorCode(err, ApiErrorCode.NotFound)) {
          this.adjustmentForm.controls.userId.setErrors({ notFound: true });
          this.userServerError.set('Selected recycler account was not found');
        } else if (!fieldErrors) {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }
}
