import { TableColumn } from '@shared/components/table/data-table/data-table';
import { InspectionReportListItem } from '@models/inspection/inspection.view-model';
import { InspectionReportStatus, INSPECTION_REPORT_STATUS_LABELS } from '@models/inspection/inspection-report-status.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { SelectOption } from '@shared/components/form/select/select';

export const REVIEW_QUEUE_TABLE_COLUMNS: TableColumn<InspectionReportListItem>[] = [
  {
    key: 'imageThumbnailUrl',
    label: 'Frame',
    width: '80px',
  },
  {
    key: 'sessionId',
    label: 'Session & Report',
    sortable: true,
    width: '180px',
  },
  {
    key: 'binId',
    label: 'Bin',
    sortable: true,
    width: '120px',
  },
  {
    key: 'mlPredictedWasteType',
    label: 'ML Prediction & Confidence',
    sortable: true,
    width: '240px',
  },
  {
    key: 'userFeedback',
    label: 'User Feedback',
  },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    value: (row) => (row.date ? new Date(row.date).getTime() : 0),
    width: '160px',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '170px',
  },
];

export const INSPECTION_STATUS_OPTIONS: SelectOption[] = [
  { label: 'All statuses', value: '' },
  {
    label: INSPECTION_REPORT_STATUS_LABELS[InspectionReportStatus.Pending],
    value: InspectionReportStatus.Pending,
  },
  {
    label: INSPECTION_REPORT_STATUS_LABELS[InspectionReportStatus.Reviewed],
    value: InspectionReportStatus.Reviewed,
  },
  {
    label: INSPECTION_REPORT_STATUS_LABELS[InspectionReportStatus.SentToRetraining],
    value: InspectionReportStatus.SentToRetraining,
  },
];

export function getInspectionReportStatusBadgeVariant(status: unknown): BadgeVariant {
  switch (status) {
    case InspectionReportStatus.Pending:
      return 'warning';
    case InspectionReportStatus.Reviewed:
      return 'success';
    case InspectionReportStatus.SentToRetraining:
      return 'purple';
    default:
      return 'neutral';
  }
}

export function getInspectionReportStatusLabel(status: unknown): string {
  if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(INSPECTION_REPORT_STATUS_LABELS, status)) {
    return INSPECTION_REPORT_STATUS_LABELS[status as InspectionReportStatus];
  }
  return String(status ?? '');
}
