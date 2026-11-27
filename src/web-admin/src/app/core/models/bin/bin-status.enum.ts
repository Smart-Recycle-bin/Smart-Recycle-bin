export const BinStatus = {
  Available: 'AVAILABLE',
  EightyPercentFull: 'FULL_80',
  NeedsServicing: 'NEEDS_SERVICE_95',
  Offline: 'OFFLINE',
} as const;

export type BinStatus = (typeof BinStatus)[keyof typeof BinStatus];

export const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  [BinStatus.Available]: 'AVAILABLE',
  [BinStatus.EightyPercentFull]: '≥80% FULL',
  [BinStatus.NeedsServicing]: '≥95% FULL',
  [BinStatus.Offline]: 'Offline',
};
