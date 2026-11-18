import { TableColumn } from '@shared/components/table/data-table/data-table';
import { LedgerRow } from '@models/wallet/ledger.view-model';
import { LedgerSource, LEDGER_SOURCE_LABELS } from '@models/wallet/ledger-source.enum';
import { LedgerEntryType } from '@models/wallet/ledger-entry-type.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { SelectOption } from '@shared/components/form/select/select';
import { SegmentedOption } from '@shared/components/segmented-control/segmented-control';
import { NumberCellTone } from '@shared/components/table/cells/number-cell/number-cell';

export const LEDGER_TABLE_COLUMNS: TableColumn<LedgerRow>[] = [
  {
    key: 'transactionId',
    label: 'Transaction ID',
    width: '140px',
  },
  {
    key: 'timestamp',
    label: 'Timestamp',
    sortable: true,
    value: (row) => (row.timestamp ? new Date(row.timestamp).getTime() : 0),
    width: '160px',
  },
  {
    key: 'userName',
    label: 'User',
    sortable: true,
  },
  {
    key: 'binId',
    label: 'Bin',
    width: '120px',
  },
  {
    key: 'detailText',
    label: 'Items / Detail',
  },
  {
    key: 'pointsDelta',
    label: 'Points Delta',
    align: 'right',
    sortable: true,
    width: '140px',
  },
  {
    key: 'runningBalance',
    label: 'Balance',
    align: 'right',
    sortable: true,
    width: '120px',
  },
  {
    key: 'source',
    label: 'Type',
    sortable: true,
    width: '170px',
  },
];

export const LEDGER_TYPE_OPTIONS: SelectOption[] = [
  { label: 'All types', value: '' },
  { label: LEDGER_SOURCE_LABELS[LedgerSource.SessionConfirm], value: LedgerSource.SessionConfirm },
  { label: LEDGER_SOURCE_LABELS[LedgerSource.VoucherRedemption], value: LedgerSource.VoucherRedemption },
  { label: LEDGER_SOURCE_LABELS[LedgerSource.ManualAdjustment], value: LedgerSource.ManualAdjustment },
];

export const ADJUSTMENT_TYPE_OPTIONS: SegmentedOption<LedgerEntryType>[] = [
  { label: 'Credit (+)', value: LedgerEntryType.Credit },
  { label: 'Debit (-)', value: LedgerEntryType.Debit },
];

export function formatSignedPoints(points: number): string {
  if (points > 0) {
    return `+${points.toLocaleString('en-US')}`;
  }
  return points.toLocaleString('en-US');
}

export function getPointsTone(points: number): NumberCellTone {
  if (points > 0) return 'positive';
  if (points < 0) return 'negative';
  return 'default';
}

export function getLedgerSourceBadgeVariant(source: unknown): BadgeVariant {
  switch (source) {
    case LedgerSource.SessionConfirm:
      return 'success';
    case LedgerSource.VoucherRedemption:
      return 'neutral';
    case LedgerSource.ManualAdjustment:
      return 'warning';
    default:
      return 'neutral';
  }
}

export function getLedgerSourceLabel(source: unknown): string {
  if (typeof source === 'string' && Object.prototype.hasOwnProperty.call(LEDGER_SOURCE_LABELS, source)) {
    return LEDGER_SOURCE_LABELS[source as LedgerSource];
  }
  return String(source ?? '');
}
