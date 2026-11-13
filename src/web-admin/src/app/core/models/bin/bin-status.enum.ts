export const BinStatus = {
  Available: 'AVAILABLE',
  EightyPercentFull: '≥80% FULL',
  NeedsServicing: '≥95% FULL / NEEDS SERVICING',
  Offline: 'offline', // PROPOSED (UI p4, p17)
} as const;

export type BinStatus = (typeof BinStatus)[keyof typeof BinStatus];

export const BIN_STATUS_LABELS: Record<BinStatus, string> = {
  [BinStatus.Available]: 'Available',
  [BinStatus.EightyPercentFull]: '≥80% full',
  [BinStatus.NeedsServicing]: '≥95% - needs servicing',
  [BinStatus.Offline]: 'Offline',
};
