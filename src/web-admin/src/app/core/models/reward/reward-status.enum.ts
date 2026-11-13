export const RewardStatus = {
  InStock: 'in_stock',
  OutOfStock: 'out_of_stock',
  Archived: 'archived',
} as const;

export type RewardStatus = (typeof RewardStatus)[keyof typeof RewardStatus];

export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  [RewardStatus.InStock]: 'Active',
  [RewardStatus.OutOfStock]: 'Out of Stock',
  [RewardStatus.Archived]: 'Archived',
};
