export const LedgerSource = {
  SessionConfirm: 'session_confirm',
  VoucherRedemption: 'voucher_redemption',
  ManualAdjustment: 'manual_adjustment', // PROPOSED (UI p8)
} as const;

export type LedgerSource = (typeof LedgerSource)[keyof typeof LedgerSource];

export const LEDGER_SOURCE_LABELS: Record<LedgerSource, string> = {
  [LedgerSource.SessionConfirm]: 'Disposal credit',
  [LedgerSource.VoucherRedemption]: 'Redemption debit',
  [LedgerSource.ManualAdjustment]: 'Manual adjustment',
};
