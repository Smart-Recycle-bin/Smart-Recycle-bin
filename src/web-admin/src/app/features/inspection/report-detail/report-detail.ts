import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Id } from '@models/common/id.model';
import { InspectionReportDetail, WasteTypeOption } from '@models/inspection/inspection.view-model';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';
import { InspectionReportsService } from '@services/inspection/inspection-reports.service';
import { ReviewQueueStateService } from '@services/inspection/review-queue-state.service';
import { ToastService } from '@services/toast/toast.service';
import { getErrorMessage, isNotFoundError } from '@core/errors';
import {
  getInspectionReportStatusBadgeVariant,
  getInspectionReportStatusLabel,
} from '../review-queue/review-queue.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Badge } from '@shared/components/badge/badge';
import { Button } from '@shared/components/button/button';
import { Select, SelectOption } from '@shared/components/form/select/select';
import { Textarea } from '@shared/components/form/textarea/textarea';
import { Progress, ProgressColor } from '@shared/components/progress/progress';
import { Modal } from '@shared/components/overlay/modal/modal';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { Icon } from '@shared/components/icon/icon';
import { formatDateTime } from '@shared/utils/datetime';
import { DateTimePipe } from '@shared/pipes';

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [
    CommonModule,
    PageHeader,
    Badge,
    Button,
    Select,
    Textarea,
    Progress,
    Modal,
    ResourceState,
    EmptyState,
    Icon,
    DateTimePipe,
  ],
  templateUrl: './report-detail.html',
  styleUrl: './report-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inspectionReportsService = inject(InspectionReportsService);
  private readonly reviewQueueState = inject(ReviewQueueStateService);
  private readonly toastService = inject(ToastService);

  readonly getStatusBadgeVariant = getInspectionReportStatusBadgeVariant;
  readonly getStatusLabel = getInspectionReportStatusLabel;

  /**
   * Data state signals
   */
  readonly report = signal<InspectionReportDetail | null>(null);
  readonly wasteTypes = signal<WasteTypeOption[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);
  readonly isSubmittingAction = signal<boolean>(false);

  /**
   * Action selection & Zoom modal signals
   */
  readonly selectedWasteType = signal<Id | ''>('');
  readonly adminJustification = signal<string>('');
  readonly isZoomModalOpen = signal<boolean>(false);
  readonly zoomedFrameUrl = signal<string | null>(null);

  readonly isPending = computed(() => {
    return this.report()?.status === InspectionReportStatus.Pending;
  });

  readonly canSendToRetraining = computed(() => {
    return this.report()?.status === InspectionReportStatus.Reviewed;
  });

  readonly isQueuedForRetraining = computed(() => {
    return this.report()?.status === InspectionReportStatus.SentToRetraining;
  });

  readonly isNotFound = computed(() => {
    return isNotFoundError(this.error());
  });

  navigateBack(): void {
    this.router.navigate(['/review-queue']);
  }

  readonly headerTitle = computed(() => {
    const d = this.report();
    if (!d) return 'Inspection Report';
    const label = d.airId || `Report #${d.reportId}`;
    return `${label} · Session ${d.sessionId}`;
  });

  readonly headerSubtitle = computed(() => {
    const d = this.report();
    if (!d) return '';
    const binLabel = d.binName ? `${d.binName} (#${d.binId})` : `${d.binId}`;
    return `${binLabel} · ${d.userName} · ${formatDateTime(d.date)}`;
  });

  readonly wasteTypeOptions = computed<SelectOption[]>(() => {
    return this.wasteTypes().map((wt) => ({
      label: wt.name,
      value: wt.wasteTypeId,
    }));
  });

  readonly hasClassDistribution = computed(() => {
    const d = this.report();
    return Boolean(d?.classConfidences && Object.keys(d.classConfidences).length > 0);
  });

  readonly confidenceEntries = computed(() => {
    const d = this.report();
    if (!d) return [];
    if (d.classConfidences && Object.keys(d.classConfidences).length > 0) {
      return Object.entries(d.classConfidences).map(([className, confidence]) => ({
        className,
        confidence,
        percent: Math.round(confidence * 100),
        color: (confidence >= 0.7 ? 'success' : 'warning') as ProgressColor,
      }));
    }
    if (d.predictedConfidence !== null && d.predictedConfidence !== undefined) {
      const confidence = d.predictedConfidence;
      return [
        {
          className: d.predictedWasteType,
          confidence,
          percent: Math.round(confidence * 100),
          color: (confidence >= 0.7 ? 'success' : 'warning') as ProgressColor,
        },
      ];
    }
    return [];
  });

  ngOnInit(): void {
    this.loadWasteTypes();
    this.loadDetail();
  }

  loadWasteTypes(): void {
    this.inspectionReportsService.getWasteTypeOptions().subscribe({
      next: (types) => {
        this.wasteTypes.set(types);
        if (types[0] && this.selectedWasteType() === '') {
          this.selectedWasteType.set(types[0].wasteTypeId);
        }
      },
    });
  }

  loadDetail(): void {
    const rawReportId = this.route.snapshot.paramMap.get('reportId');
    const reportId =
      rawReportId && /^\d+$/.test(rawReportId.trim()) ? Number(rawReportId.trim()) : Number.NaN;
    if (!Number.isInteger(reportId) || reportId <= 0) {
      this.error.set(
        new Error(
          rawReportId ? 'Invalid report ID provided in route.' : 'No report ID provided in route.'
        )
      );
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.inspectionReportsService.getReportDetail(reportId).subscribe({
      next: (detail) => {
        this.report.set(detail);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err);
        this.isLoading.set(false);
      },
    });
  }

  handleWasteTypeChange(value: string | number): void {
    if (value === '' || value === null || value === undefined) {
      this.selectedWasteType.set('');
      return;
    }
    const parsed = Number(value);
    this.selectedWasteType.set(Number.isInteger(parsed) && parsed > 0 ? parsed : '');
  }

  openZoomModal(frameUrl: string): void {
    this.zoomedFrameUrl.set(frameUrl);
    this.isZoomModalOpen.set(true);
  }

  closeZoomModal(): void {
    this.isZoomModalOpen.set(false);
    this.zoomedFrameUrl.set(null);
  }

  applyCorrectCategory(): void {
    const d = this.report();
    if (!d || !this.isPending() || this.isSubmittingAction()) return;

    const chosen = this.selectedWasteType();
    if (typeof chosen !== 'number') return;

    const chosenName =
      this.wasteTypes().find((wt) => wt.wasteTypeId === chosen)?.name ?? String(chosen);
    const justification =
      this.adminJustification().trim() || 'Corrected category per user survey rejection review';

    this.isSubmittingAction.set(true);
    this.inspectionReportsService
      .correctCategory(d.reportId, {
        wasteTypeId: chosen,
        adminJustification: justification,
      })
      .subscribe({
        next: (res) => {
          const ptsNote =
            res.pointsCredited && res.pointsCredited > 0
              ? ` Session finalized (+${res.pointsCredited} pts).`
              : '';
          this.toastService.success(`Waste category corrected to "${chosenName}".${ptsNote}`);
          this.adminJustification.set('');
          this.isSubmittingAction.set(false);
          this.reloadAndRefreshBadge();
        },
        error: (err) => {
          this.isSubmittingAction.set(false);
          this.toastService.error(getErrorMessage(err));
        },
      });
  }

  applyDismiss(): void {
    const d = this.report();
    if (!d || !this.isPending() || this.isSubmittingAction()) return;

    const justification =
      this.adminJustification().trim() || 'Classification matches the captured frame.';

    this.isSubmittingAction.set(true);
    this.inspectionReportsService
      .dismissReport(d.reportId, { adminJustification: justification })
      .subscribe({
        next: () => {
          this.toastService.success('Report resolved: ML prediction confirmed as correct.');
          this.adminJustification.set('');
          this.isSubmittingAction.set(false);
          this.reloadAndRefreshBadge();
        },
        error: (err) => {
          this.isSubmittingAction.set(false);
          this.toastService.error(getErrorMessage(err));
        },
      });
  }

  applyRetrain(): void {
    const d = this.report();
    if (!d || !this.canSendToRetraining() || this.isSubmittingAction()) return;

    this.isSubmittingAction.set(true);
    this.inspectionReportsService
      .sendToRetraining(d.reportId)
      .subscribe({
        next: () => {
          this.toastService.success(
            'Report queued locally for retraining (automated ML training is not connected).'
          );
          this.isSubmittingAction.set(false);
          this.reloadAndRefreshBadge();
        },
        error: (err) => {
          this.isSubmittingAction.set(false);
          this.toastService.error(getErrorMessage(err));
        },
      });
  }

  private reloadAndRefreshBadge(): void {
    this.loadDetail();
    this.reviewQueueState.refresh().subscribe({ error: () => {} });
  }
}
