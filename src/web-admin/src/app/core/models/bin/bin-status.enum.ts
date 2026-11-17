export const BinStatus = {
  Available: 'AVAILABLE',
  EightyPercentFull: '≥80% FULL',
  NeedsServicing: '≥95% FULL / NEEDS SERVICING',
  Offline: 'offline', // PROPOSED (UI p4, p17)
} as const;

export type BinStatus = (typeof BinStatus)[keyof typeof BinStatus];

export const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  [BinStatus.Available]: 'AVAILABLE',
  [BinStatus.EightyPercentFull]: '≥80% FULL',
  [BinStatus.NeedsServicing]: '≥95% FULL',
  [BinStatus.Offline]: 'Offline',
};
