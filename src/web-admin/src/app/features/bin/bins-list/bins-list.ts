import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BinsService } from '../../../core/services/bin/bins.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { BinListItem, BinQuery } from '../../../core/models/bin/bin.view-model';
import {
  BinStatus,
  BIN_STATUS_LABELS,
} from '../../../core/models/bin/bin-status.enum';
import { RegisterBinRequest } from '../../../core/models/bin/bin.dto';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { isApiErrorCode, getErrorMessage } from '../../../core/errors/error-message';
import {
  BIN_TABLE_COLUMNS,
  getBinStatusBadgeVariant,
  getBinStatusLabel,
} from './bins-list.config';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Button } from '../../../shared/components/button/button';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { MonoIdCell } from '../../../shared/components/table/cells/mono-id-cell/mono-id-cell';
import { FillLevelCell } from '../../../shared/components/table/cells/fill-level-cell/fill-level-cell';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { Badge } from '../../../shared/components/badge/badge';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { Input } from '../../../shared/components/form/input/input';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Icon } from '../../../shared/components/icon/icon';

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
    Icon,
  ],
  templateUrl: './bins-list.html',
  styleUrl: './bins-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BinsList implements OnInit {
  private readonly binsService = inject(BinsService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly tableColumns = BIN_TABLE_COLUMNS;
  readonly getStatusBadgeVariant = getBinStatusBadgeVariant;
  readonly getStatusLabel = getBinStatusLabel;
  readonly binStatusLabels = BIN_STATUS_LABELS;

  /**
   * Data state signals
   */
  readonly bins = signal<BinListItem[]>([]);
  readonly allBins = signal<BinListItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  /**
   * Filter state signals
   */
  readonly searchTerm = signal<string>('');
  readonly selectedDistrict = signal<string>('');
  readonly selectedStatus = signal<string>('');
  readonly selectedCollector = signal<string>('');

  /**
   * Computed header subtitle: "N registered smart bins across M districts"
   */
  readonly headerSubtitle = computed(() => {
    const list = this.allBins();
    const count = list.length;
    const districtsCount = new Set(list.map((b) => b.district).filter(Boolean)).size;
    return `${count} registered smart bins across ${districtsCount} districts`;
  });

  /**
   * Filter dropdown options derived from allBins dataset
   */
  readonly districtOptions = computed<SelectOption[]>(() => {
    const districts = Array.from(
      new Set(this.allBins().map((b) => b.district).filter(Boolean))
    ).sort();
    return [
      { label: 'All districts', value: '' },
      ...districts.map((d) => ({ label: d, value: d })),
    ];
  });

  readonly statusOptions = computed<SelectOption[]>(() => {
    return [
      { label: 'All statuses', value: '' },
      { label: BIN_STATUS_LABELS[BinStatus.Available], value: BinStatus.Available },
      { label: BIN_STATUS_LABELS[BinStatus.EightyPercentFull], value: BinStatus.EightyPercentFull },
      { label: BIN_STATUS_LABELS[BinStatus.NeedsServicing], value: BinStatus.NeedsServicing },
      { label: BIN_STATUS_LABELS[BinStatus.Offline], value: BinStatus.Offline },
    ];
  });

  readonly collectorOptions = computed<SelectOption[]>(() => {
    const map = new Map<string, string>();
    for (const b of this.allBins()) {
      if (b.collectorId && b.collectorName) {
        map.set(b.collectorId, b.collectorName);
      }
    }
    const sorted = Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    return [
      { label: 'All collectors', value: '' },
      ...sorted.map(([id, name]) => ({ label: name, value: id })),
    ];
  });

  /**
   * Register Bin Drawer State
   */
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly serialServerError = signal<string>('');

  readonly registerForm = this.fb.group({
    deviceSerial: ['', [Validators.required]],
    district: ['', [Validators.required]],
    latitude: [null as number | null, [Validators.required]],
    longitude: [null as number | null, [Validators.required]],
    capacityThresholdKg: [120 as number | null, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.loadBins(true);
  }

  loadBins(isInitial = false): void {
    const query: BinQuery = {};

    if (this.searchTerm().trim()) {
      query.search = this.searchTerm().trim();
    }
    if (this.selectedDistrict()) {
      query.district = this.selectedDistrict();
    }
    if (this.selectedStatus()) {
      query.status = this.selectedStatus() as BinStatus;
    }
    if (this.selectedCollector()) {
      query.collectorId = this.selectedCollector();
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.binsService.getBins(query).subscribe({
      next: (items) => {
        this.bins.set(items);
        if (isInitial || this.allBins().length === 0) {
          this.allBins.set(items);
        }
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err);
        this.isLoading.set(false);
      },
    });
  }

  handleSearch(val: string): void {
    this.searchTerm.set(val);
    this.loadBins();
  }

  handleDistrictChange(val: string | number): void {
    this.selectedDistrict.set(String(val));
    this.loadBins();
  }

  handleStatusChange(val: string | number): void {
    this.selectedStatus.set(String(val));
    this.loadBins();
  }

  handleCollectorChange(val: string | number): void {
    this.selectedCollector.set(String(val));
    this.loadBins();
  }

  openRegisterDrawer(): void {
    this.registerForm.reset({
      deviceSerial: '',
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
    const payload: RegisterBinRequest = {
      deviceSerial: raw.deviceSerial!.trim(),
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
        this.loadBins(true);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        if (isApiErrorCode(err, ApiErrorCode.DeviceAlreadyRegistered)) {
          this.registerForm.controls.deviceSerial.setErrors({ duplicate: true });
          this.serialServerError.set('A bin with this device serial is already registered.');
        } else {
          this.toastService.error(getErrorMessage(err));
        }
      },
    });
  }
}
