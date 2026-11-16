import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../../core/services/reward/catalog.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import {
  AdminRewardItem,
  RewardQuery,
} from '../../../core/models/reward/reward.view-model';
import {
  RewardStatus,
  REWARD_STATUS_LABELS,
} from '../../../core/models/reward/reward-status.enum';
import {
  RewardCategory,
  REWARD_CATEGORY_LABELS,
} from '../../../core/models/reward/reward-category.enum';
import {
  VoucherCodeType,
  VOUCHER_CODE_TYPE_LABELS,
} from '../../../core/models/reward/voucher-code-type.enum';
import {
  CreateRewardRequest,
  UpdateRewardRequest,
} from '../../../core/models/reward/reward.dto';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Button } from '../../../shared/components/button/button';
import { IconButton } from '../../../shared/components/button/icon-button/icon-button';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { SegmentedControl } from '../../../shared/components/segmented-control/segmented-control';
import { Select } from '../../../shared/components/form/select/select';
import { Input } from '../../../shared/components/form/input/input';
import { Textarea } from '../../../shared/components/form/textarea/textarea';
import { NumberInput } from '../../../shared/components/form/number-input/number-input';
import { DateInput } from '../../../shared/components/form/date-input/date-input';
import { FileUpload } from '../../../shared/components/form/file-upload/file-upload';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { ConfirmDialog } from '../../../shared/components/overlay/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { formatDate } from '../../../shared/utils/datetime';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import {
  CATEGORY_FORM_OPTIONS,
  CatalogViewMode,
  REWARD_STATUS_BADGE_VARIANTS,
  REWARD_TABLE_ACTIONS,
  REWARD_TABLE_COLUMNS,
  STATUS_FILTER_OPTIONS,
  VIEW_MODE_OPTIONS,
  VOUCHER_CODE_TYPE_OPTIONS,
} from './catalog.config';

@Component({
  selector: 'app-catalog',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    PageHeader,
    Button,
    IconButton,
    Badge,
    SegmentedControl,
    Select,
    Input,
    Textarea,
    NumberInput,
    DateInput,
    FileUpload,
    Drawer,
    ConfirmDialog,
    DataTable,
    CellTemplateDirective,
    ResourceState,
    Skeleton,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly viewModeOptions = VIEW_MODE_OPTIONS;
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly categoryOptions = CATEGORY_FORM_OPTIONS;
  readonly voucherCodeTypeOptions = VOUCHER_CODE_TYPE_OPTIONS;
  readonly tableColumns = REWARD_TABLE_COLUMNS;
  readonly tableActions = REWARD_TABLE_ACTIONS;
  readonly RewardStatus = RewardStatus;

  readonly rewards = signal<AdminRewardItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  // Client-only view toggle ('grid' | 'table')
  readonly viewMode = signal<CatalogViewMode>('grid');

  // Status filter query
  readonly selectedStatus = signal<RewardStatus | ''>('');

  // Drawer state
  readonly isDrawerOpen = signal<boolean>(false);
  readonly editingReward = signal<AdminRewardItem | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly isUploadingImage = signal<boolean>(false);
  readonly uploadedImageUrl = signal<string | null>(null);

  // Archive confirm dialog state
  readonly isConfirmArchiveOpen = signal<boolean>(false);
  readonly rewardToArchive = signal<AdminRewardItem | null>(null);
  readonly isArchiving = signal<boolean>(false);

  // Derived subtitle per p12
  readonly subtitle = computed(
    () => `${this.rewards().length} items · stock reaching zero is flagged automatically`
  );

  readonly rewardForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    category: [RewardCategory.Groceries, [Validators.required]],
    voucherCodeType: [VoucherCodeType.Code, [Validators.required]],
    pointsCost: [null, [Validators.required, Validators.min(1)]],
    stock: [null, [Validators.required, Validators.min(0)]],
    validFrom: [''],
    validUntil: [''],
  });

  private computeDefaultDates(): { validFrom: string; validUntil: string } {
    const now = new Date();
    const validFrom = formatDate(now);
    const nextYear = new Date(now.getTime());
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const validUntil = formatDate(nextYear);
    return { validFrom, validUntil };
  }

  ngOnInit(): void {
    this.loadRewards();
  }

  loadRewards(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const query: RewardQuery = {};
    if (this.selectedStatus()) {
      query.status = this.selectedStatus() as RewardStatus;
    }

    this.catalogService
      .getRewards(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.rewards.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err);
          this.isLoading.set(false);
        },
      });
  }

  handleViewModeChange(mode: string | number): void {
    this.viewMode.set(mode as CatalogViewMode);
  }

  handleStatusChange(status: string | number): void {
    this.selectedStatus.set(status as RewardStatus | '');
    this.loadRewards();
  }

  openNewItemDrawer(): void {
    this.editingReward.set(null);
    this.uploadedImageUrl.set(null);
    const { validFrom, validUntil } = this.computeDefaultDates();
    this.rewardForm.reset({
      title: '',
      description: '',
      category: RewardCategory.Groceries,
      voucherCodeType: VoucherCodeType.Code,
      pointsCost: null,
      stock: null,
      validFrom,
      validUntil,
    });
    this.isDrawerOpen.set(true);
  }

  openEditDrawer(item: AdminRewardItem): void {
    this.editingReward.set(item);
    this.uploadedImageUrl.set(item.imageUrl ?? null);
    const { validFrom, validUntil } = this.computeDefaultDates();
    this.rewardForm.reset({
      title: item.title,
      description: item.description,
      category: item.category,
      voucherCodeType: item.voucherCodeType,
      pointsCost: item.pointsCost,
      stock: item.stock,
      validFrom: item.validFrom ? formatDate(item.validFrom) : validFrom,
      validUntil: item.validUntil ? formatDate(item.validUntil) : validUntil,
    });
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.editingReward.set(null);
    this.uploadedImageUrl.set(null);
    this.rewardForm.reset();
  }

  onFileSelected(file: File | null): void {
    if (!file) {
      this.uploadedImageUrl.set(null);
      return;
    }

    this.isUploadingImage.set(true);
    this.catalogService
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.uploadedImageUrl.set(res.imageUrl);
          this.isUploadingImage.set(false);
          this.toastService.success('Reward image uploaded');
        },
        error: () => {
          this.isUploadingImage.set(false);
          this.toastService.error('Failed to upload image asset');
        },
      });
  }

  submitDrawerForm(): void {
    if (this.rewardForm.invalid) {
      this.rewardForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.rewardForm.value;

    const editing = this.editingReward();
    if (editing) {
      const updateReq: UpdateRewardRequest = {
        title: formVal.title,
        description: formVal.description,
        category: formVal.category,
        voucherCodeType: formVal.voucherCodeType,
        pointsCost: Number(formVal.pointsCost),
        stock: Number(formVal.stock),
        validFrom: formVal.validFrom,
        validUntil: formVal.validUntil,
        imageUrl: this.uploadedImageUrl() ?? undefined,
      };

      this.catalogService
        .updateReward(editing.itemId, updateReq)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.success('Reward item updated successfully');
            this.closeDrawer();
            this.loadRewards();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.toastService.error(err?.message || 'Failed to update reward item');
          },
        });
    } else {
      const createReq: CreateRewardRequest = {
        title: formVal.title,
        description: formVal.description,
        category: formVal.category,
        voucherCodeType: formVal.voucherCodeType,
        pointsCost: Number(formVal.pointsCost),
        stock: Number(formVal.stock),
        validFrom: formVal.validFrom,
        validUntil: formVal.validUntil,
        imageUrl: this.uploadedImageUrl() ?? undefined,
      };

      this.catalogService
        .createReward(createReq)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.success('Reward item created successfully');
            this.closeDrawer();
            this.loadRewards();
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.toastService.error(err?.message || 'Failed to create reward item');
          },
        });
    }
  }

  openArchiveDialog(item: AdminRewardItem): void {
    if (item.status === RewardStatus.Archived) return;
    this.rewardToArchive.set(item);
    this.isConfirmArchiveOpen.set(true);
  }

  closeArchiveDialog(): void {
    this.isConfirmArchiveOpen.set(false);
    this.rewardToArchive.set(null);
  }

  confirmArchive(): void {
    const item = this.rewardToArchive();
    if (!item) return;

    this.isArchiving.set(true);
    this.catalogService
      .archiveReward(item.itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isArchiving.set(false);
          this.toastService.success(`"${item.title}" archived`);
          this.closeArchiveDialog();
          this.loadRewards();
        },
        error: (err) => {
          this.isArchiving.set(false);
          this.toastService.error(err?.message || 'Failed to archive reward item');
        },
      });
  }

  handleTableAction(event: { action: string; row: AdminRewardItem }): void {
    if (event.action === 'edit') {
      this.openEditDrawer(event.row);
    } else if (event.action === 'archive') {
      this.openArchiveDialog(event.row);
    }
  }

  readonly getRowId = (row: AdminRewardItem): string => row.itemId;

  getStatusBadgeVariant(status: RewardStatus): BadgeVariant {
    return REWARD_STATUS_BADGE_VARIANTS[status] ?? 'neutral';
  }

  getStatusLabel(status: RewardStatus): string {
    return REWARD_STATUS_LABELS[status] ?? status;
  }

  getCategoryLabel(category: RewardCategory | string): string {
    return REWARD_CATEGORY_LABELS[category as RewardCategory] ?? category;
  }

  getCodeTypeLabel(type: VoucherCodeType | string): string {
    return VOUCHER_CODE_TYPE_LABELS[type as VoucherCodeType] ?? type;
  }
}
