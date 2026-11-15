import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountStatus } from '../../../core/models/user/account-status.enum';
import { CollectorListItem, CollectorQuery, CollectorAssignedBin } from '../../../core/models/collector/collector.view-model';
import { CollectorCredentialsMode } from '../../../core/models/collector/collector-credentials-mode.enum';
import { CreateCollectorRequest, UpdateCollectorRequest } from '../../../core/models/collector/collector.dto';
import { BinListItem } from '../../../core/models/bin/bin.view-model';
import { CollectorsService } from '../../../core/services/collector/collectors.service';
import { BinsService } from '../../../core/services/bin/bins.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage } from '../../../core/errors/error-message';
import {
  COLLECTOR_TABLE_COLUMNS,
  COLLECTOR_TABLE_ACTIONS,
  CREDENTIALS_MODE_OPTIONS,
  getCollectorStatusBadgeVariant,
  getCollectorStatusLabel,
} from './collectors.config';
import { getBinStatusBadgeVariant, getBinStatusLabel } from '../../bin/bins-list/bins-list.config';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { FillLevelCell } from '../../../shared/components/table/cells/fill-level-cell/fill-level-cell';
import { Badge } from '../../../shared/components/badge/badge';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { Modal } from '../../../shared/components/overlay/modal/modal';
import { ConfirmDialog } from '../../../shared/components/overlay/confirm-dialog/confirm-dialog';
import { SegmentedControl } from '../../../shared/components/segmented-control/segmented-control';
import { Input } from '../../../shared/components/form/input/input';
import { Button } from '../../../shared/components/button/button';
import { IconButton } from '../../../shared/components/button/icon-button/icon-button';
import { Icon } from '../../../shared/components/icon/icon';

@Component({
  selector: 'app-collectors',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PageHeader,
    SearchInput,
    Select,
    DataTable,
    CellTemplateDirective,
    UserCell,
    FillLevelCell,
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
  ],
  templateUrl: './collectors.html',
  styleUrl: './collectors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collectors implements OnInit {
  private readonly collectorsService = inject(CollectorsService);
  private readonly binsService = inject(BinsService);
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
   * Data state signals
   */
  readonly collectors = signal<CollectorListItem[]>([]);
  readonly allCollectors = signal<CollectorListItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);
  readonly searchTerm = signal<string>('');

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
  readonly availableBins = signal<BinListItem[]>([]);
  readonly isLoadingAvailableBins = signal<boolean>(false);

  /**
   * Create Collector Credentials Mode
   */
  readonly createCredentialsMode = signal<CollectorCredentialsMode>(
    CollectorCredentialsMode.InviteLink
  );

  /**
   * Distinct district options computed from loaded collectors
   */
  readonly districtOptions = computed<SelectOption[]>(() => {
    const list = this.allCollectors();
    const districts = Array.from(new Set(list.map((c) => c.district).filter(Boolean))).sort();
    if (districts.length === 0) {
      return [
        { label: 'Cairo', value: 'Cairo' },
        { label: 'Giza', value: 'Giza' },
        { label: 'Alexandria', value: 'Alexandria' },
        { label: 'Qalyubia', value: 'Qalyubia' },
      ];
    }
    return districts.map((d) => ({ label: d, value: d }));
  });

  /**
   * Available bin select options for assignment
   */
  readonly availableBinOptions = computed<SelectOption[]>(() => {
    return this.availableBins().map((b) => ({
      label: `${b.name} (${b.binId}) · ${b.district} [${b.fillLevel}%]`,
      value: b.binId,
    }));
  });

  /**
   * Reactive form for creating a new collector account (UI p7)
   */
  readonly createForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required]],
    temporaryPassword: [''],
    district: ['Cairo'],
  });

  /**
   * Reactive form for editing collector details
   */
  readonly editForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required]],
    district: ['Cairo'],
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

  ngOnInit(): void {
    this.loadCollectors();
  }

  loadCollectors(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const query: CollectorQuery = {};
    const search = this.searchTerm().trim();
    if (search) {
      query.search = search;
    }

    this.collectorsService.getCollectors(query).subscribe({
      next: (data) => {
        this.collectors.set(data);
        if (!search) {
          this.allCollectors.set(data);
        }
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
    this.loadCollectors();
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
    const defaultDistrict = String(this.districtOptions()[0]?.value || 'Cairo');
    this.createForm.reset({
      displayName: '',
      email: '',
      phoneNumber: '',
      temporaryPassword: '',
      district: defaultDistrict,
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
      passwordCtrl.setValidators([Validators.required]);
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
      req.temporaryPassword = val.temporaryPassword || undefined;
    }

    this.isSubmitting.set(true);
    this.collectorsService.createCollector(req).subscribe({
      next: (res) => {
        this.toastService.success(`Collector account for ${res.displayName} provisioned successfully`);
        this.isSubmitting.set(false);
        this.closeCreateDrawer();
        this.loadCollectors();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (isApiErrorCode(err, ApiErrorCode.EmailAlreadyExists) || (err as { status?: number })?.status === 409) {
          this.createForm.controls.email.setErrors({ emailAlreadyExists: true });
          this.createForm.controls.email.markAsTouched();
          this.emailServerError.set('This email address is already registered');
        } else {
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
        this.toastService.success(`Collector ${val.displayName} updated successfully`);
        this.isSubmitting.set(false);
        this.closeEditDrawer();
        this.loadCollectors();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }

  /**
   * Assigned Bins Drawer Methods
   */
  openAssignedBinsDrawer(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.isAssignedBinsDrawerOpen.set(true);
    this.isLoadingAssignedBins.set(true);
    this.assignedBins.set([]);

    this.collectorsService.getAssignedBins(collector.collectorId).subscribe({
      next: (bins) => {
        this.assignedBins.set(bins);
        this.isLoadingAssignedBins.set(false);
      },
      error: (err) => {
        this.isLoadingAssignedBins.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }

  closeAssignedBinsDrawer(): void {
    this.isAssignedBinsDrawerOpen.set(false);
    this.selectedCollector.set(null);
    this.assignedBins.set([]);
  }

  /**
   * Assign Smart Bin Modal Methods
   */
  openAssignModal(collector: CollectorListItem): void {
    this.selectedCollector.set(collector);
    this.assignBinForm.reset({ binId: '' });
    this.isAssignModalOpen.set(true);
    this.isLoadingAvailableBins.set(true);

    this.binsService.getBins().subscribe({
      next: (bins) => {
        this.availableBins.set(bins);
        this.isLoadingAvailableBins.set(false);
      },
      error: (err) => {
        this.isLoadingAvailableBins.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
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
        this.loadCollectors();
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
        this.loadCollectors();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastService.error(getErrorMessage(err));
      },
    });
  }
}
