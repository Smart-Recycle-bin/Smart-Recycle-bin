import { TableColumn } from '@shared/components/table/data-table/data-table';
import { BinListItem } from '@models/bin/bin.view-model';
import { BinStatus, BIN_STATUS_LABELS } from '@models/bin/bin-status.enum';
import { BadgeVariant } from '@shared/components/badge/badge';

export const BIN_TABLE_COLUMNS: TableColumn<BinListItem>[] = [
  {
    key: 'binId',
    label: 'Bin ID',
    sortable: true,
    width: '120px',
  },
  {
    key: 'name',
    label: 'Name & Area',
    sortable: true,
  },
  {
    key: 'district',
    label: 'District',
    sortable: true,
    width: '140px',
  },
  {
    key: 'fillLevel',
    label: 'Fill Level',
    sortable: true,
    width: '180px',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '180px',
  },
  {
    key: 'collectorName',
    label: 'Collector',
    sortable: true,
    width: '200px',
  },
  {
    key: 'lastServicedAt',
    label: 'Last Serviced',
    sortable: true,
    value: (row) => (row.lastServicedAt ? new Date(row.lastServicedAt).getTime() : 0),
    width: '160px',
  },
];

export function getBinStatusBadgeVariant(status: unknown): BadgeVariant {
  switch (status) {
    case BinStatus.Available:
      return 'success';
    case BinStatus.EightyPercentFull:
      return 'warning';
    case BinStatus.NeedsServicing:
      return 'danger';
    case BinStatus.Offline:
    default:
      return 'neutral';
  }
}

export function getBinStatusLabel(status: unknown): string {
  if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(BIN_STATUS_LABELS, status)) {
    return BIN_STATUS_LABELS[status as BinStatus];
  }
  return String(status ?? '');
}
