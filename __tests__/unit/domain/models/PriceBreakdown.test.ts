import { PriceBreakdown } from '../../../../src/domain/models/PriceBreakdown';

describe('PriceBreakdown', () => {
  it('should create a complete price breakdown with all fields', () => {
    const breakdown: PriceBreakdown = {
      basePrice: 2.0,
      perMinutePrice: 15.0,
      eBikeSurcharge: 1.5,
      isMonthlySubscription: false,
      total: 16.5,
      dualRoleDiscount: 2.0,
      tierDiscount: 1.0,
      flexBalanceUsed: 5.0,
      flexBalanceEarned: 0.5
    };

    expect(breakdown.basePrice).toBe(2.0);
    expect(breakdown.perMinutePrice).toBe(15.0);
    expect(breakdown.eBikeSurcharge).toBe(1.5);
    expect(breakdown.isMonthlySubscription).toBe(false);
    expect(breakdown.total).toBe(16.5);
    expect(breakdown.dualRoleDiscount).toBe(2.0);
    expect(breakdown.tierDiscount).toBe(1.0);
    expect(breakdown.flexBalanceUsed).toBe(5.0);
    expect(breakdown.flexBalanceEarned).toBe(0.5);
  });
});