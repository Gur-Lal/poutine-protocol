export interface PriceBreakdown {
  basePrice: number;
  perMinutePrice: number;
  eBikeSurcharge: number;
  isMonthlySubscription: boolean;
  tierDiscount: number;
  dualRoleDiscount: number;
  total: number;
  dualRoleDiscount?: number;
  tierDiscount?: number;
  flexBalanceUsed?: number;
  flexBalanceEarned?: number;
}