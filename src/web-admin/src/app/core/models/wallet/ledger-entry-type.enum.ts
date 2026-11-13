export const LedgerEntryType = {
  Credit: 'credit',
  Debit: 'debit',
} as const;

export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const LEDGER_ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  [LedgerEntryType.Credit]: 'Credit',
  [LedgerEntryType.Debit]: 'Debit',
};
