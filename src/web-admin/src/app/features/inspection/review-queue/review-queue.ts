import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { InspectionReportListItem, InspectionReportQuery, InspectionSummary } from '../../../core/models/inspection/inspection.view-model';
import { InspectionReportStatus } from '../../../core/models/inspection/inspection-report-status.enum';
import { InspectionReportsService } from '../../../core/services/inspection/inspection-reports.service';
import { ReviewQueueStateService } from '../../../core/services/inspection/review-queue-state.service';
import {
  REVIEW_QUEUE_TABLE_COLUMNS,
  INSPECTION_STATUS_OPTIONS,
  getInspectionReportStatusBadgeVariant,
  getInspectionReportStatusLabel,
} from './review-queue.config';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select } from '../../../shared/components/form/select/select';
import { DataTable } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { MonoIdCell } from '../../../shared/components/table/cells/mono-id-cell/mono-id-cell';
import { Badge } from '../../../shared/components/badge/badge';
import { Progress, ProgressColor } from '../../../shared/components/progress/progress';
import { ResourceState } from '../../../shared/components/resource-state/resource-state';
import { Icon } from '../../../shared/components/icon/icon';
import { DateTimePipe } from '../../../shared/pipes';

@Component({
  selector: 'app-review-queue',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    PageHeader,
    SearchInput,
    Select,
    DataTable,
    CellTemplateDirective,
    MonoIdCell,
    Badge,
    Progress,
    ResourceState,
    Icon,
    DateTimePipe,
  ],
  templateUrl: './review-queue.html',
  styleUrl: './review-queue.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewQueue implements OnInit {
  private readonly inspectionReportsService = inject(InspectionReportsService);
  private readonly reviewQueueState = inject(ReviewQueueStateService);
  private readonly router = inject(Router);

  readonly tableColumns = REVIEW_QUEUE_TABLE_COLUMNS;
  readonly statusOptions = INSPECTION_STATUS_OPTIONS;
  readonly getStatusBadgeVariant = getInspectionReportStatusBadgeVariant;
  readonly getStatusLabel = getInspectionReportStatusLabel;

  /**
   * Data state signals
   */
  readonly summary = signal<InspectionSummary | null>(null);
  readonly isLoadingSummary = signal<boolean>(true);

  readonly reports = signal<InspectionReportListItem[]>([]);
  readonly isLoadingReports = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  /**
   * Filter state signals
   */
  readonly searchTerm = signal<string>('');
  readonly selectedStatus = signal<string>('');

  ngOnInit(): void {
    this.loadSummary();
    this.loadReports();
  }

  loadSummary(): void {
    this.isLoadingSummary.set(true);
    this.inspectionReportsService.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.reviewQueueState.setPendingCount(summary.pendingReviewCount);
        this.isLoadingSummary.set(false);
      },
      error: () => {
        this.isLoadingSummary.set(false);
      },
    });
  }

  loadReports(): void {
    this.isLoadingReports.set(true);
    this.error.set(null);

    const query: InspectionReportQuery = {};
    const search = this.searchTerm().trim();
    if (search) {
      query.search = search;
    }
    const status = this.selectedStatus();
    if (status) {
      query.status = status as InspectionReportStatus;
    }

    this.inspectionReportsService.getReports(query).subscribe({
      next: (data) => {
        this.reports.set(data);
        this.isLoadingReports.set(false);
      },
      error: (err) => {
        this.error.set(err);
        this.isLoadingReports.set(false);
      },
    });
  }

  handleSearch(term: string): void {
    this.searchTerm.set(term);
    this.loadReports();
  }

  handleStatusChange(status: string | number): void {
    this.selectedStatus.set(String(status ?? ''));
    this.loadReports();
  }

  filterByStatus(status: InspectionReportStatus): void {
    this.selectedStatus.set(status);
    this.loadReports();
  }

  navigateToDetail(row: InspectionReportListItem): void {
    this.router.navigate(['/review-queue', row.reportId]);
  }

  getConfidenceColor(confidence: number): ProgressColor {
    return confidence >= 0.7 ? 'success' : 'warning';
  }

  formatConfidencePercent(confidence: number): number {
    return Math.round(confidence * 100);
  }
}
