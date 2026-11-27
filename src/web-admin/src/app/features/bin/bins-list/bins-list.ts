import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { BinsService } from '@services/bin/bins.service';
import { LookupsService } from '@services/lookup/lookups.service';
import { ToastService } from '@services/toast/toast.service';
import { BinListItem, BinQuery } from '@models/bin/bin.view-model';
import {
  BinStatus,
  BIN_STATUS_LABELS,
} from '@models/bin/bin-status.enum';
import {
  RegisterBinRequest,
  UpdateBinMetadataRequest,
} from '@models/bin/bin.dto';
import { Id } from '@models/common/id.model';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage, getFieldErrors } from '@core/errors/error-message';
import {
  trimmedRequired,
  maxLen,
  latitude,
  longitude,
} from '@shared/validators';
import {
  BIN_TABLE_ACTIONS,
  BIN_TABLE_COLUMNS,
  getBinStatusBadgeVariant,
  getBinStatusLabel,
} from './bins-list.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Button } from '@shared/components/button/button';
import { SearchInput } from '@shared/components/form/search-input/search-input';
import { Select, SelectOption } from '@shared/components/form/select/select';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { MonoIdCell } from '@shared/components/table/cells/mono-id-cell/mono-id-cell';
import { FillLevelCell } from '@shared/components/table/cells/fill-level-cell/fill-level-cell';
import { UserCell } from '@shared/components/table/cells/user-cell/user-cell';
import { Badge } from '@shared/components/badge/badge';
import { Drawer } from '@shared/components/overlay/drawer/drawer';
import { Input } from '@shared/components/form/input/input';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { DateTimePipe } from '@shared/pipes';
import { createPagedList } from '@shared/utils/paged-list';
import { pluralNoun } from '@shared/utils/format';

@Component({
  selector: 'app-bins-list',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Button,
    SearchInput,
    Select,
    DataTable,
    CellTemplateDirective,
    MonoIdCell,
    FillLevelCell,
    UserCell,
    Badge,
    Drawer,
    Input,
    ResourceState,
    DateTimePipe,
  ],
  templateUrl: './bins-list.html',
  styleUrl: './bins-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BinsList {
  private readonly binsService = inject(BinsService);
  private readonly lookupsService = inject(LookupsService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tableColumns = BIN_TABLE_COLUMNS;
  readonly tableActions = BIN_TABLE_ACTIONS;
  readonly getRowId = (row: BinListItem): Id => row.binId;
  readonly getStatusBadgeVariant = getBinStatusBadgeVariant;
  readonly getStatusLabel = getBinStatusLabel;
  readonly binStatusLabels = BIN_STATUS_LABELS;

  /**
   * Paged-list infrastructure
   */
  readonly pagedList = createPagedList<BinListItem, BinQuery>({
    fetch: (query) => this.binsService.getBins(query),
    debounceKeys: ['search'],
    debounceMs: 300,
  });

  /**
   * Filter dropdown options from LookupsService
   */
  private readonly districtsRefresh$ = new BehaviorSubject<void>(undefined);

  readonly districtOptions = toSignal(
    this.districtsRefresh$.pipe(
      switchMap(() => this.lookupsService.getDistricts().pipe(catchError(() => of([])))),
      map((districts) => [
        { label: 'All districts', value: '' },
        ...districts.map((d) => ({ label: d.name, value: d.name })),
      ])
    ),
    { initialValue: [{ label: 'All districts', value: '' }] }
  );

  readonly statusOptions = computed<SelectOption[]>(() => [
    { label: 'All statuses', value: '' },
    { label: BIN_STATUS_LABELS[BinStatus.Available], value: BinStatus.Available },
    { label: BIN_STATUS_LABELS[BinStatus.EightyPercentFull], value: BinStatus.EightyPercentFull },
    { label: BIN_STATUS_LABELS[BinStatus.NeedsServicing], value: BinStatus.NeedsServicing },
    { label: BIN_STATUS_LABELS[BinStatus.Offline], value: BinStatus.Offline },
  ]);

  readonly collectorOptions = toSignal(
    this.lookupsService.getCollectors().pipe(
      catchError(() => of([])),
      map((collectors) => [
        { label: 'All collectors', value: '' },
        ...collectors.map((c) => ({ label: c.displayName, value: c.collectorId })),
      ])
    ),
    { initialValue: [{ label: 'All collectors', value: '' }] }
  );

  /**
   * Header subtitle: "N registered smart bins across M districts"
   */
  readonly headerSubtitle = computed(() => {
    const count = this.pagedList.total();
    const districtsCount = Math.max(0, this.districtOptions().length - 1);
    const binWord = pluralNoun(count, 'smart bin', 'smart bins');
    if (districtsCount === 0) {
      return `${count} registered ${binWord}`;
    }
    const districtWord = pluralNoun(districtsCount, 'district', 'districts');
    return `${count} registered ${binWord} across ${districtsCount} ${districtWord}`;
  });

  private readonly capacityValidators = [
    trimmedRequired,
    Validators.min(0.1),
    Validators.max(10000),
  ];

  /**
   * Register & Edit Bin Drawer State
   */
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly serialServerError = signal<string>('');

  readonly isEditDrawerOpen = signal<boolean>(false);
  readonly isEditSubmitting = signal<boolean>(false);
  readonly editingBin = signal<BinListItem | null>(null);

  readonly registerForm = this.fb.group({
    deviceSerial: ['', [trimmedRequired, maxLen(100)]],
    name: ['', [trimmedRequired, maxLen(150)]],
    area: ['', [maxLen(150)]],
    district: ['', [trimmedRequired, maxLen(150)]],
    latitude: [null as number | null, [trimmedRequired, latitude]],
    longitude: [null as number | null, [trimmedRequired, longitude]],
    capacityThresholdKg: [120 as number | null, this.capacityValidators],
  });

  readonly editForm = this.fb.group({
    name: ['', [trimmedRequired, maxLen(150)]],
    area: ['', [maxLen(150)]],
    district: ['', [trimmedRequired, maxLen(150)]],
    latitude: [null as number | null, [trimmedRequired, latitude]],
    longitude: [null as number | null, [trimmedRequired, longitude]],
    capacityThresholdKg: [null as number | null, this.capacityValidators],
  });

  handleSearch(val: string): void {
    this.pagedList.patchFilters({ search: val || undefined });
  }

  handleDistrictChange(val: string | number): void {
    this.pagedList.patchFilters({ district: val ? String(val) : undefined });
  }

  handleStatusChange(val: string | number): void {
    this.pagedList.patchFilters({ status: val ? (val as BinStatus) : undefined });
  }

  handleCollectorChange(val: string | number): void {
    const parsed =
      val === '' || val === null || val === undefined ? undefined : Number(val);
    this.pagedList.patchFilters({
      collectorId: parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
    });
  }

  handleTableAction(event: { action: string; row: BinListItem }): void {
    if (event.action === 'edit') {
      this.openEditDrawer(event.row);
    }
  }

  openRegisterDrawer(): void {
    this.registerForm.reset({
      deviceSerial: '',
      name: '',
      area: '',
      district: '',
      latitude: null,
      longitude: null,
      capacityThresholdKg: 120,
    });
    this.serialServerError.set('');
    this.isSubmitting.set(false);
    this.isDrawerOpen.set(true);
  }

  closeRegisterDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  submitRegisterBin(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.serialServerError.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const raw = this.registerForm.getRawValue();
    const trimmedArea = raw.area?.trim();
    const payload: RegisterBinRequest = {
      deviceSerial: raw.deviceSerial!.trim(),
      name: raw.name!.trim(),
      area: trimmedArea || undefined,
      district: raw.district!.trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      capacityThresholdKg: Number(raw.capacityThresholdKg),
    };

    this.binsService.registerBin(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.toastService.success('Smart bin registered successfully.');
        this.closeRegisterDrawer();
        this.pagedList.reload();
        this.lookupsService.invalidate('districts');
        this.districtsRefresh$.next();
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        const appliedFieldErrors = this.applyServerFieldErrors(this.registerForm, err);
        if (isApiErrorCode(err, ApiErrorCode.DeviceAlreadyRegistered)) {
          this.registerForm.controls.deviceSerial.setErrors({ duplicate: true });
          this.serialServerError.set('A bin with this device serial is already registered.');
        } else if (!appliedFieldErrors) {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }

  openEditDrawer(row: BinListItem): void {
    this.editingBin.set(row);
    this.editForm.reset({
      name: row.name ?? '',
      area: row.area ?? '',
      district: row.district ?? '',
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      capacityThresholdKg: row.capacityThresholdKg ?? null,
    });
    this.isEditSubmitting.set(false);
    this.isEditDrawerOpen.set(true);
  }

  closeEditDrawer(): void {
    this.isEditDrawerOpen.set(false);
    this.editingBin.set(null);
  }

  submitEditBin(): void {
    const target = this.editingBin();
    if (!target || this.isEditSubmitting()) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isEditSubmitting.set(true);

    const raw = this.editForm.getRawValue();
    const payload: UpdateBinMetadataRequest = {
      name: raw.name!.trim(),
      area: raw.area?.trim() || '',
      district: raw.district!.trim(),
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      capacityThresholdKg: Number(raw.capacityThresholdKg),
    };

    this.binsService.updateBinMetadata(target.binId, payload).subscribe({
      next: () => {
        this.isEditSubmitting.set(false);
        this.toastService.success('Smart bin updated successfully.');
        this.closeEditDrawer();
        this.pagedList.reload();
        this.lookupsService.invalidate('districts');
        this.districtsRefresh$.next();
      },
      error: (err: unknown) => {
        this.isEditSubmitting.set(false);
        const appliedFieldErrors = this.applyServerFieldErrors(this.editForm, err);
        if (!appliedFieldErrors) {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }

  private applyServerFieldErrors(form: FormGroup, err: unknown): boolean {
    const fieldErrors = getFieldErrors(err);
    if (!fieldErrors) {
      return false;
    }
    for (const [field, message] of Object.entries(fieldErrors)) {
      const ctrl = form.get(field);
      if (ctrl) {
        ctrl.setErrors({ serverError: message });
      }
    }
    return true;
  }
}
