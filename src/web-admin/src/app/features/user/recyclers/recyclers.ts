import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DateOnlyPipe } from '@shared/pipes';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountStatus } from '@models/user/account-status.enum';
import { RecyclerListItem, RecyclerQuery } from '@models/user/recycler.view-model';
import { RecyclersService } from '@services/user/recyclers.service';
import { ToastService } from '@services/toast/toast.service';
import { getErrorMessage, getFieldErrors } from '@core/errors/error-message';
import { trimmedRequired, maxLen } from '@shared/validators';
import {
  RECYCLER_TABLE_COLUMNS,
  RECYCLER_TABLE_ACTIONS,
  RECYCLER_STATUS_OPTIONS,
  getRecyclerStatusBadgeVariant,
  getRecyclerStatusLabel,
} from './recyclers.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { SearchInput } from '@shared/components/form/search-input/search-input';
import { Select } from '@shared/components/form/select/select';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { NumberCell } from '@shared/components/table/cells/number-cell/number-cell';
import { Badge } from '@shared/components/badge/badge';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Modal } from '@shared/components/overlay/modal/modal';
import { ConfirmDialog } from '@shared/components/overlay/confirm-dialog/confirm-dialog';
import { Textarea } from '@shared/components/form/textarea/textarea';
import { Button } from '@shared/components/button/button';
import { createPagedList } from '@shared/utils/paged-list';

@Component({
  selector: 'app-recyclers',
  standalone: true,
  imports: [
    CommonModule,
    DateOnlyPipe,
    DecimalPipe,
    ReactiveFormsModule,
    PageHeader,
    SearchInput,
    Select,
    DataTable,
    CellTemplateDirective,
    UserCell,
    NumberCell,
    Badge,
    ResourceState,
    Modal,
    ConfirmDialog,
    Textarea,
    Button,
  ],
  templateUrl: './recyclers.html',
  styleUrl: './recyclers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recyclers {
  private readonly recyclersService = inject(RecyclersService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tableColumns = RECYCLER_TABLE_COLUMNS;
  readonly tableActions = RECYCLER_TABLE_ACTIONS;
  readonly statusOptions = RECYCLER_STATUS_OPTIONS;
  readonly getStatusBadgeVariant = getRecyclerStatusBadgeVariant;
  readonly getStatusLabel = getRecyclerStatusLabel;

  /**
   * Paged-list infrastructure
   */
  readonly pagedList = createPagedList<RecyclerListItem, RecyclerQuery>({
    fetch: (query) => this.recyclersService.getRecyclers(query),
    debounceKeys: ['search'],
    debounceMs: 300,
  });

  /**
   * Action / Modal dialog state signals
   */
  readonly selectedRecycler = signal<RecyclerListItem | null>(null);
  readonly isSuspendModalOpen = signal<boolean>(false);
  readonly isUnsuspendDialogOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  /**
   * Reactive form for suspension justification
   */
  readonly suspendForm = this.fb.group({
    reason: ['', [trimmedRequired, maxLen(500)]],
  });

  private readonly suspendFormChanges = toSignal(this.suspendForm.valueChanges);

  readonly suspendReasonError = computed(() => {
    this.suspendFormChanges();
    const control = this.suspendForm.controls.reason;
    if (control.hasError('trimmedRequired') || control.hasError('required')) return 'Reason for suspension is required';
    if (control.hasError('maxLen')) return 'Reason cannot exceed 500 characters';
    if (control.hasError('serverError')) return control.getError('serverError');
    return '';
  });

  readonly unsuspendDescription = computed(() => {
    const user = this.selectedRecycler();
    if (!user) return 'Are you sure you want to restore access to this recycler account?';
    return `Are you sure you want to restore access for ${user.name} (${user.userId})? Their account status will be set back to Active and they will be able to log in and participate.`;
  });

  handleSearch(term: string): void {
    this.pagedList.patchFilters({ search: term || undefined });
  }

  handleStatusChange(status: string | number): void {
    this.pagedList.patchFilters({ status: status ? (status as AccountStatus) : undefined });
  }

  handleTableAction(event: { action: string; row: RecyclerListItem }): void {
    if (event.action === 'suspend') {
      this.selectedRecycler.set(event.row);
      this.suspendForm.reset({ reason: '' });
      this.isSuspendModalOpen.set(true);
    } else if (event.action === 'unsuspend') {
      this.selectedRecycler.set(event.row);
      this.isUnsuspendDialogOpen.set(true);
    }
  }

  closeSuspendModal(): void {
    if (this.isSubmitting()) return;
    this.isSuspendModalOpen.set(false);
    this.selectedRecycler.set(null);
    this.suspendForm.reset({ reason: '' });
  }

  confirmSuspend(): void {
    if (this.suspendForm.invalid || this.isSubmitting()) {
      this.suspendForm.markAllAsTouched();
      return;
    }

    const recycler = this.selectedRecycler();
    if (!recycler) return;

    const reason = (this.suspendForm.value.reason || '').trim();
    this.isSubmitting.set(true);

    this.recyclersService.suspendRecycler(recycler.userId, reason).subscribe({
      next: () => {
        this.toastService.success(`Account for ${recycler.name} suspended successfully`);
        this.isSubmitting.set(false);
        this.closeSuspendModal();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const fieldErrors = getFieldErrors(err);
        if (fieldErrors?.['reason']) {
          this.suspendForm.controls.reason.setErrors({ serverError: fieldErrors['reason'] });
          this.suspendForm.controls.reason.markAsTouched();
        } else {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }

  closeUnsuspendDialog(): void {
    if (this.isSubmitting()) return;
    this.isUnsuspendDialogOpen.set(false);
    this.selectedRecycler.set(null);
  }

  confirmUnsuspend(): void {
    const recycler = this.selectedRecycler();
    if (!recycler || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.recyclersService.unsuspendRecycler(recycler.userId).subscribe({
      next: () => {
        this.toastService.success(`Account for ${recycler.name} restored to Active`);
        this.isSubmitting.set(false);
        this.closeUnsuspendDialog();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }
}
