import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { CollectorListItem, CollectorQuery, CollectorAssignedBin } from '@models/collector/collector.view-model';
import { CollectorCredentialsMode } from '@models/collector/collector-credentials-mode.enum';
import { CreateCollectorRequest, UpdateCollectorRequest } from '@models/collector/collector.dto';
import { CollectorsService } from '@services/collector/collectors.service';
import { BinsService } from '@services/bin/bins.service';
import { LookupsService } from '@services/lookup/lookups.service';
import { ToastService } from '@services/toast/toast.service';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage, getFieldErrors } from '@core/errors/error-message';
import {
  trimmedRequired,
  maxLen,
  phone,
  strongTempPassword,
} from '@shared/validators';
import {
  COLLECTOR_TABLE_COLUMNS,
  COLLECTOR_TABLE_ACTIONS,
  CREDENTIALS_MODE_OPTIONS,
  getCollectorStatusBadgeVariant,
  getCollectorStatusLabel,
} from './collectors.config';
import { getBinStatusBadgeVariant, getBinStatusLabel } from '@features/bin/bins-list/bins-list.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { SearchInput } from '@shared/components/form/search-input/search-input';
import { Select, SelectOption } from '@shared/components/form/select/select';
import { AsyncSelect } from '@shared/components/form/async-select/async-select';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { Badge } from '@shared/components/badge/badge';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Drawer } from '@shared/components/overlay/drawer/drawer';
import { Modal } from '@shared/components/overlay/modal/modal';
import { ConfirmDialog } from '@shared/components/overlay/confirm-dialog/confirm-dialog';
import { SegmentedControl } from '@shared/components/segmented-control/segmented-control';
import { Input } from '@shared/components/form/input/input';
import { Button } from '@shared/components/button/button';
import { IconButton } from '@shared/components/button/icon-button/icon-button';
import { Icon } from '@shared/components/icon/icon';
import { DateTimePipe } from '@shared/pipes';
import { createPagedList } from '@shared/utils/paged-list';
import { AssignedBinsDrawer } from './assigned-bins-drawer/assigned-bins-drawer';

@Component({
  selector: 'app-collectors',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeader,
    SearchInput,
    Select,
    AsyncSelect,
    DataTable,
    CellTemplateDirective,
    UserCell,
    Badge,
    ResourceState,
    Drawer,
    Modal,
    ConfirmDialog,
    SegmentedControl,
    Input,
    Button,
    IconButton,
    Icon,
    DateTimePipe,
    AssignedBinsDrawer,
  ],
  templateUrl: './collectors.html',
  styleUrl: './collectors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collectors {
  private readonly collectorsService = inject(CollectorsService);
  private readonly binsService = inject(BinsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tableColumns = COLLECTOR_TABLE_COLUMNS;
  readonly tableActions = COLLECTOR_TABLE_ACTIONS;
  readonly credentialsModeOptions = CREDENTIALS_MODE_OPTIONS;
  readonly getStatusBadgeVariant = getCollectorStatusBadgeVariant;
  readonly getStatusLabel = getCollectorStatusLabel;
  readonly getBinBadgeVariant = getBinStatusBadgeVariant;
  readonly getBinLabel = getBinStatusLabel;

  /**
   * Paged-list infrastructure
   */
  readonly pagedList = createPagedList<CollectorListItem, CollectorQuery>({
    fetch: (query) => this.collectorsService.getCollectors(query),
    debounceKeys: ['search'],
    debounceMs: 300,
  });

  /**
   * Drawer & Modal visibility state signals
   */
  readonly isCreateDrawerOpen = signal<boolean>(false);
  readonly isEditDrawerOpen = signal<boolean>(false);
  readonly isAssignedBinsDrawerOpen = signal<boolean>(false);
  readonly isAssignModalOpen = signal<boolean>(false);
  readonly isDeactivateDialogOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  /**
   * Action context state signals
   */
  readonly selectedCollector = signal<CollectorListItem | null>(null);
  readonly assignedBins = signal<CollectorAssignedBin[]>([]);
  readonly isLoadingAssignedBins = signal<boolean>(false);
  readonly assignedBinsError = signal<string | null>(null);

  /**
   * Create Collector Credentials Mode
   */
  readonly createCredentialsMode = signal<CollectorCredentialsMode>(
    CollectorCredentialsMode.InviteLink
  );

  /**
   * District options from LookupsService
   */
  readonly districtOptions = toSignal(
    this.lookupsService.getDistricts().pipe(
      map((districts) => districts.map((d) => ({ label: d.name, value: d.name as string | number })))
    ),
    { initialValue: [] as SelectOption[] }
  );

  /**
   * Fetch function for app-async-select in Assign Bin Modal
   */
  readonly fetchAvailableBins = (term: string) => {
    const collector = this.selectedCollector();
    return this.binsService.getBins({ search: term, pageSize: 50 }).pipe(
      map((page) =>
        page.items
          .filter(
            (b) =>
              b.collectorId !== collector?.collectorId &&
              b.collectorName !== collector?.name
          )
          .map((b) => ({
            label: `${b.name} (${b.binId}) · ${b.district} [${b.fillLevel}%]`,
            value: b.binId,
          }))
      )
    );
  };

  /**
   * Reactive form for creating a new collector account (UI p7)
   */
  readonly createForm = this.fb.nonNullable.group({
    displayName: ['', [trimmedRequired, maxLen(100)]],
    email: ['', [trimmedRequired, Validators.email]],
    phoneNumber: ['', [trimmedRequired, phone]],
    temporaryPassword: [''],
    district: [''],
  });

  /**
   * Reactive form for editing collector details
   */
  readonly editForm = this.fb.nonNullable.group({
    displayName: ['', [trimmedRequired, maxLen(100)]],
    email: ['', [trimmedRequired, Validators.email]],
    phoneNumber: ['', [trimmedRequired, phone]],
    district: [''],
  });

  /**
   * Reactive form for assigning a smart bin to a collector
   */
  readonly assignBinForm = this.fb.nonNullable.group({
    binId: ['', [Validators.required]],
  });

  readonly emailServerError = signal<string>('');

  readonly createEmailError = computed(() => {
    const serverErr = this.emailServerError();
    if (serverErr) return serverErr;
    const control = this.createForm.controls.email;
    if (!control.touched && !control.dirty) return '';
    if (control.hasError('emailAlreadyExists')) return 'This email address is already registered';
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    return '';
  });

  readonly deactivateDescription = computed(() => {
    const c = this.selectedCollector();
    if (!c) return 'Are you sure you want to deactivate this collector account?';
    return `Are you sure you want to deactivate ${c.name} (${c.collectorId})? They will no longer be able to log in or service assigned bins.`;
  });

  handleSearch(term: string): void {
    this.pagedList.patchFilters({ search: term || undefined });
  }

  handleTableAction(event: { action: string; row: CollectorListItem }): void {
    if (event.action === 'edit') {
      this.openEditDrawer(event.row);
    } else if (event.action === 'assign') {
      this.openAssignModal(event.row);
    } else if (event.action === 'deactivate') {
      this.openDeactivateDialog(event.row);
    }
  }

  /**
   * Create Collector Drawer Methods
   */
  openCreateDrawer(): void {
    this.emailServerError.set('');
    this.createCredentialsMode.set(CollectorCredentialsMode.InviteLink);
    this.createForm.reset({
      displayName: '',
      email: '',
      phoneNumber: '',
      temporaryPassword: '',
      district: '',
    });
    this.createForm.controls.temporaryPassword.clearValidators();
    this.createForm.controls.temporaryPassword.updateValueAndValidity();
    this.isCreateDrawerOpen.set(true);
  }

  closeCreateDrawer(): void {
    if (this.isSubmitting()) return;
    this.isCreateDrawerOpen.set(false);
  }

  handleCredentialsModeChange(mode: string | number): void {
    const m = mode as CollectorCredentialsMode;
    this.createCredentialsMode.set(m);
    const passwordCtrl = this.createForm.controls.temporaryPassword;
    if (m === CollectorCredentialsMode.TemporaryPassword) {
      passwordCtrl.setValidators([trimmedRequired, strongTempPassword]);
    } else {
      passwordCtrl.clearValidators();
      passwordCtrl.setValue('');
    }
    passwordCtrl.updateValueAndValidity();
  }

  submitCreate(): void {
    this.emailServerError.set('');
    if (this.createForm.invalid || this.isSubmitting()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const val = this.createForm.getRawValue();
    const req: CreateCollectorRequest = {
      displayName: val.displayName.trim(),
      email: val.email.trim(),
      phoneNumber: val.phoneNumber.trim(),
      district: val.district || undefined,
      credentialsMode: this.createCredentialsMode(),
    };

    if (this.createCredentialsMode() === CollectorCredentialsMode.TemporaryPassword) {
      req.temporaryPassword = val.temporaryPassword ? val.temporaryPassword.trim() : undefined;
    }

    this.isSubmitting.set(true);
    this.collectorsService.createCollector(req).subscribe({
      next: () => {
        this.toastService.success(`Collector account for ${val.displayName.trim()} provisioned successfully`);
        this.isSubmitting.set(false);
        this.closeCreateDrawer();
        this.pagedList.reload();
        this.lookupsService.invalidate('collectors');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const fieldErrors = getFieldErrors(err);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, msg]) => {
            const ctrl = this.createForm.get(field);
            if (ctrl) {
              ctrl.setErrors({ serverError: msg });
              ctrl.markAsTouched();
            }
          });
        }
        if (isApiErrorCode(err, ApiErrorCode.EmailAlreadyExists) || (err as { status?: number })?.status === 409) {
          this.createForm.controls.email.setErrors({ emailAlreadyExists: true });
          this.createForm.controls.email.markAsTouched();
          this.emailServerError.set('This email address is already registered');
        } else if (!fieldErrors) {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }

  /**
   * Edit Collector Drawer Methods
   */
  openEditDrawer(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.editForm.reset({
      displayName: collector.name,
      email: collector.email,
      phoneNumber: collector.phone,
      district: collector.district,
    });
    this.isEditDrawerOpen.set(true);
  }

  closeEditDrawer(): void {
    if (this.isSubmitting()) return;
    this.isEditDrawerOpen.set(false);
    this.selectedCollector.set(null);
  }

  submitEdit(): void {
    if (this.editForm.invalid || this.isSubmitting()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const collector = this.selectedCollector();
    if (!collector) return;

    const val = this.editForm.getRawValue();
    const req: UpdateCollectorRequest = {
      displayName: val.displayName.trim(),
      email: val.email.trim(),
      phoneNumber: val.phoneNumber.trim(),
      district: val.district || undefined,
    };

    this.isSubmitting.set(true);
    this.collectorsService.updateCollector(collector.collectorId, req).subscribe({
      next: () => {
        this.toastService.success(`Collector details for ${val.displayName.trim()} updated successfully`);
        this.isSubmitting.set(false);
        this.closeEditDrawer();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const fieldErrors = getFieldErrors(err);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, msg]) => {
            const ctrl = this.editForm.get(field);
            if (ctrl) {
              ctrl.setErrors({ serverError: msg });
              ctrl.markAsTouched();
            }
          });
        } else {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }

  /**
   * Assigned Bins Drawer Methods
   */
  openAssignedBinsDrawer(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.isAssignedBinsDrawerOpen.set(true);
    this.loadAssignedBins(collector.collectorId);
  }

  loadAssignedBins(collectorId: string): void {
    this.isLoadingAssignedBins.set(true);
    this.assignedBinsError.set(null);

    this.collectorsService.getAssignedBins(collectorId).subscribe({
      next: (bins: CollectorAssignedBin[]) => {
        this.assignedBins.set(bins);
        this.isLoadingAssignedBins.set(false);
      },
      error: (err: unknown) => {
        this.isLoadingAssignedBins.set(false);
        const msg = getErrorMessage(err);
        this.assignedBinsError.set(msg);
        this.toastService.error(msg);
      },
    });
  }

  closeAssignedBinsDrawer(): void {
    this.isAssignedBinsDrawerOpen.set(false);
    this.selectedCollector.set(null);
    this.assignedBins.set([]);
    this.assignedBinsError.set(null);
  }

  retryLoadAssignedBins(): void {
    const col = this.selectedCollector();
    if (col) {
      this.loadAssignedBins(col.collectorId);
    }
  }

  onDrawerAssignBin(): void {
    const col = this.selectedCollector();
    if (col) {
      this.openAssignModal(col);
    }
  }

  /**
   * Assign Smart Bin Modal Methods
   */
  openAssignModal(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.assignBinForm.reset({ binId: '' });
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    if (this.isSubmitting()) return;
    this.isAssignModalOpen.set(false);
    this.selectedCollector.set(null);
  }

  submitAssign(): void {
    if (this.assignBinForm.invalid || this.isSubmitting()) {
      this.assignBinForm.markAllAsTouched();
      return;
    }

    const collector = this.selectedCollector();
    if (!collector) return;

    const binId = this.assignBinForm.getRawValue().binId;
    this.isSubmitting.set(true);

    this.binsService.assignCollector(binId, { collectorId: collector.collectorId }).subscribe({
      next: () => {
        this.toastService.success(`Smart bin assigned to ${collector.name} successfully`);
        this.isSubmitting.set(false);
        this.closeAssignModal();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }

  /**
   * Deactivate Dialog Methods
   */
  openDeactivateDialog(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.isDeactivateDialogOpen.set(true);
  }

  closeDeactivateDialog(): void {
    if (this.isSubmitting()) return;
    this.isDeactivateDialogOpen.set(false);
    this.selectedCollector.set(null);
  }

  confirmDeactivate(): void {
    const collector = this.selectedCollector();
    if (!collector || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.collectorsService.deactivateCollector(collector.collectorId).subscribe({
      next: () => {
        this.toastService.success(`Collector ${collector.name} deactivated successfully`);
        this.isSubmitting.set(false);
        this.closeDeactivateDialog();
        this.pagedList.reload();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }
}
