import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerRow, LedgerQuery } from '../../../core/models/wallet/ledger.view-model';
import { LedgerSource } from '../../../core/models/wallet/ledger-source.enum';
import { LedgerEntryType } from '../../../core/models/wallet/ledger-entry-type.enum';
import { ManualAdjustmentRequest } from '../../../core/models/wallet/ledger.dto';
import { RecyclerListItem } from '../../../core/models/user/recycler.view-model';
import { LedgerService } from '../../../core/services/wallet/ledger.service';
import { RecyclersService } from '../../../core/services/user/recyclers.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage } from '../../../core/errors/error-message';
import {
  LEDGER_TABLE_COLUMNS,
  LEDGER_TYPE_OPTIONS,
  ADJUSTMENT_TYPE_OPTIONS,
  formatSignedPoints,
  getPointsTone,
  getLedgerSourceBadgeVariant,
  getLedgerSourceLabel,
} from './ledger.config';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Notice } from '../../../shared/components/notice/notice';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { DateRangeInput, DateRangeValue } from '../../../shared/components/form/date-range-input/date-range-input';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { MonoIdCell } from '../../../shared/components/table/cells/mono-id-cell/mono-id-cell';
import { NumberCell } from '../../../shared/components/table/cells/number-cell/number-cell';
import { Badge } from '../../../shared/components/badge/badge';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { SegmentedControl } from '../../../shared/components/segmented-control/segmented-control';
import { Input } from '../../../shared/components/form/input/input';
import { NumberInput } from '../../../shared/components/form/number-input/number-input';
import { Textarea } from '../../../shared/components/form/textarea/textarea';
import { Button } from '../../../shared/components/button/button';
import { DateTimePipe } from '../../../shared/pipes';

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
    DateRangeInput,
    DataTable,
    CellTemplateDirective,
    UserCell,
    MonoIdCell,
    NumberCell,
    Badge,
    ResourceState,
    Drawer,
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
export class Ledger implements OnInit {
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
   * Data signals
   */
  readonly ledgerRows = signal<LedgerRow[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  /**
   * Filter signals
   */
  readonly searchTerm = signal<string>('');
  readonly selectedSource = signal<string>('');
  readonly dateRange = signal<DateRangeValue>({ from: null, to: null });

  /**
   * Manual Adjustment Drawer state
   */
  readonly isAdjustmentDrawerOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly recyclerUsers = signal<RecyclerListItem[]>([]);
  readonly isLoadingRecyclers = signal<boolean>(false);
  readonly adjustmentType = signal<LedgerEntryType>(LedgerEntryType.Credit);

  readonly userServerError = signal<string>('');
  readonly amountServerError = signal<string>('');
  readonly formTouched = signal<boolean>(false);

  /**
   * Form for manual points adjustment
   */
  readonly adjustmentForm = this.fb.group({
    userId: this.fb.nonNullable.control('', [Validators.required]),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    reasonCode: this.fb.nonNullable.control('ADMIN_CORRECTION'),
    reasonNote: this.fb.nonNullable.control('', [Validators.required]),
  });

  readonly userOptions = computed<SelectOption[]>(() => {
    return this.recyclerUsers().map((u) => ({
      label: `${u.name} · ${u.userId}`,
      value: u.userId,
    }));
  });

  readonly userFieldError = computed(() => {
    this.formTouched();
    const serverErr = this.userServerError();
    if (serverErr) return serverErr;
    const ctrl = this.adjustmentForm.controls.userId;
    if (!ctrl.touched && !ctrl.dirty) return '';
    if (ctrl.hasError('required')) return 'Target user is required';
    if (ctrl.hasError('notFound')) return 'User account not found';
    return '';
  });

  readonly amountFieldError = computed(() => {
    this.formTouched();
    const serverErr = this.amountServerError();
    if (serverErr) return serverErr;
    const ctrl = this.adjustmentForm.controls.amount;
    if (!ctrl.touched && !ctrl.dirty) return '';
    if (ctrl.hasError('required')) return 'Adjustment amount is required';
    if (ctrl.hasError('min')) return 'Amount must be greater than zero';
    if (ctrl.hasError('insufficientBalance')) return 'User has insufficient available points for this debit adjustment';
    return '';
  });

  ngOnInit(): void {
    this.loadLedger();
  }

  loadLedger(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const query: LedgerQuery = {};
    const search = this.searchTerm().trim();
    if (search) {
      query.search = search;
    }
    const source = this.selectedSource();
    if (source) {
      query.source = source as LedgerSource;
    }
    const range = this.dateRange();
    if (range.from) {
      query.from = range.from;
    }
    if (range.to) {
      query.to = range.to;
    }

    this.ledgerService.getLedger(query).subscribe({
      next: (page) => {
        // TODO(prompt-3): full server-side pagination UI
        this.ledgerRows.set(page.items);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err);
        this.isLoading.set(false);
      },
    });
  }

  handleSearch(term: string): void {
    this.searchTerm.set(term);
    this.loadLedger();
  }

  handleTypeChange(type: string | number): void {
    this.selectedSource.set(String(type ?? ''));
    this.loadLedger();
  }

  handleDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    this.loadLedger();
  }

  truncateId(id: string): string {
    if (!id) return '';
    if (id.length <= 12) return id;
    return id.substring(0, 10) + '…';
  }

  /**
   * Manual Adjustment Drawer logic
   */
  openAdjustmentDrawer(): void {
    this.formTouched.set(false);
    this.userServerError.set('');
    this.amountServerError.set('');
    this.adjustmentType.set(LedgerEntryType.Credit);
    this.adjustmentForm.reset({
      userId: '',
      amount: null,
      reasonCode: 'ADMIN_CORRECTION',
      reasonNote: '',
    });
    this.isAdjustmentDrawerOpen.set(true);

    if (this.recyclerUsers().length === 0) {
      this.isLoadingRecyclers.set(true);
      this.recyclersService.getRecyclers().subscribe({
        next: (page) => {
          // TODO(prompt-3): replace with picker / lookup
          const users = page.items;
          this.recyclerUsers.set(users);
          this.isLoadingRecyclers.set(false);
          if (users[0] && !this.adjustmentForm.value.userId) {
            this.adjustmentForm.controls.userId.setValue(users[0].userId);
          }
        },
        error: (err) => {
          this.isLoadingRecyclers.set(false);
          this.toastService.error(getErrorMessage(err));
        },
      });
    }
  }

  closeAdjustmentDrawer(): void {
    if (this.isSubmitting()) return;
    this.isAdjustmentDrawerOpen.set(false);
  }

  handleAdjustmentTypeChange(type: string | number): void {
    this.adjustmentType.set(type as LedgerEntryType);
    this.amountServerError.set('');
  }

  submitAdjustment(): void {
    this.userServerError.set('');
    this.amountServerError.set('');

    if (this.adjustmentForm.invalid || this.isSubmitting()) {
      this.formTouched.set(true);
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    const val = this.adjustmentForm.getRawValue();
    const payload: ManualAdjustmentRequest = {
      userId: val.userId,
      amount: Number(val.amount),
      type: this.adjustmentType(),
      reasonCode: val.reasonCode.trim() || 'ADMIN_CORRECTION',
      reasonNote: val.reasonNote.trim(),
    };

    this.isSubmitting.set(true);
    this.ledgerService.adjustPoints(payload).subscribe({
      next: (res) => {
        this.toastService.success(
          `Manual points adjustment of ${this.formatPoints(res.pointsDelta)} pts applied successfully.`
        );
        this.isSubmitting.set(false);
        this.closeAdjustmentDrawer();
        this.loadLedger();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (isApiErrorCode(err, ApiErrorCode.InsufficientBalance)) {
          this.adjustmentForm.controls.amount.setErrors({ insufficientBalance: true });
          this.amountServerError.set('User has insufficient available points for this debit adjustment');
        } else if (isApiErrorCode(err, ApiErrorCode.NotFound)) {
          this.adjustmentForm.controls.userId.setErrors({ notFound: true });
          this.userServerError.set('Target recycler account was not found');
        } else {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }
}
