import { PricingPlan, PricingCatalog, RegularPricing, EBikePricing, MonthlyPricing } from '../../../src/domain/models/Pricing';
import { Trip } from '../../../src/domain/models/Trip';

describe('PricingPlan', () => {
    it('should create a pricing plan with a name', () => {
        const plan = new PricingPlan('Basic');
        expect(plan.name).toBe('Basic');
    });
});

describe('PricingCatalog', () => {
    it('should create a catalog with plans', () => {
        const plans = [
            new PricingPlan('Basic'),
            new PricingPlan('Premium')
        ];
        const catalog = new PricingCatalog(plans);

        expect(catalog.plans).toHaveLength(2);
        expect(catalog.plans[0].name).toBe('Basic');
        expect(catalog.plans[1].name).toBe('Premium');
    });

    it('should create an empty catalog', () => {
        const catalog = new PricingCatalog([]);
        expect(catalog.plans).toHaveLength(0);
    });
});

describe('RegularPricing', () => {
    it('should calculate price for a trip', () => {
        const pricing = new RegularPricing(2, 0.5);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:30:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        expect(price).toBe(17);
    });

    it('should calculate price for a 1-minute trip', () => {
        const pricing = new RegularPricing(1, 0.25);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:01:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        // Base 1 + (1 minute * 0.25) = 1.25
        expect(price).toBe(1.25);
    });

    it('should calculate price for a zero-duration trip', () => {
        const pricing = new RegularPricing(5, 1);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:00:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        expect(price).toBe(5);
    });
});

describe('EBikePricing', () => {
    it('should calculate price including e-bike charge', () => {
        const pricing = new EBikePricing(2, 0.5, 1.5);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:20:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        // Base 2 + (20 minutes * 0.5) + 1.5 = 2 + 10 + 1.5 = 13.5
        expect(price).toBe(13.5);
    });

    it('should include e-bike charge even for zero-duration trip', () => {
        const pricing = new EBikePricing(3, 0.4, 2);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T10:00:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        expect(price).toBe(5); // Base 3 + e-bike charge 2
    });

    it('should calculate price for a 1-hour trip', () => {
        const pricing = new EBikePricing(1, 0.1, 0.5);
        const start = new Date('2024-01-01T10:00:00');
        const end = new Date('2024-01-01T11:00:00');
        const trip = { start, end } as Trip;

        const price = pricing.calculatePrice(trip);

        // Base 1 + (60 minutes * 0.1) + 0.5 = 1 + 6 + 0.5 = 7.5
        expect(price).toBe(7.5);
    });
});

describe('MonthlyPricing', () => {
    it('should create a monthly pricing with a fee', () => {
        const pricing = new MonthlyPricing(50);
        expect(pricing.monthlyFee).toBe(50);
    });

    it('should always return 0 for trip price', () => {
        const pricing = new MonthlyPricing(100);

        const price = pricing.calculatePrice();

        expect(price).toBe(0);
    });

    it('should return 0 even without a trip', () => {
        const pricing = new MonthlyPricing(75);
        const price = pricing.calculatePrice();

        expect(price).toBe(0);
    });
});