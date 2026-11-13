export const RewardCategory = {
  Groceries: 'groceries',
  FoodDelivery: 'food_delivery',
  Telecom: 'telecom',
  Entertainment: 'entertainment',
  EcoGoods: 'eco_goods',
  Charity: 'charity',
  Transport: 'transport',
  Education: 'education',
} as const;

export type RewardCategory = (typeof RewardCategory)[keyof typeof RewardCategory];

export const REWARD_CATEGORY_LABELS: Record<RewardCategory, string> = {
  [RewardCategory.Groceries]: 'Groceries',
  [RewardCategory.FoodDelivery]: 'Food delivery',
  [RewardCategory.Telecom]: 'Telecom',
  [RewardCategory.Entertainment]: 'Entertainment',
  [RewardCategory.EcoGoods]: 'Eco goods',
  [RewardCategory.Charity]: 'Charity',
  [RewardCategory.Transport]: 'Transport',
  [RewardCategory.Education]: 'Education',
};
