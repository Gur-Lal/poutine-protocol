export interface PriceBreakdown {
  basePrice: number;
  perMinutePrice: number;
  eBikeSurcharge: number;
  isMonthlySubscription: boolean;
  total: number;
  dualRoleDiscount?: number;
  tierDiscount?: number;
  flexBalanceUsed?: number;
  flexBalanceEarned?: number;
}