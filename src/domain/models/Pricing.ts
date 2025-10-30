export class PricingPlan {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class PricingCatalog {
  plans: PricingPlan[];

  constructor(plans: PricingPlan[]) {
    this.plans = plans;
  }
}

import { Trip } from "./Trip";

export interface PricingStrategy {
  calculatePrice(trip: Trip): number;
}

export class RegularPricing implements PricingStrategy {
  base: number;
  perMinute: number;

  constructor(base: number, perMinute: number) {
    this.base = base;
    this.perMinute = perMinute;
  }

  calculatePrice(trip: Trip): number {
    const durationMinutes = trip.end.getTime() - trip.start.getTime();
    return this.base + durationMinutes * this.perMinute;
  }
}

export class EBikePricing implements PricingStrategy {
  base: number;
  perMinute: number;
  eBikeCharge: number;

  constructor(base: number, perMinute: number, eBikeCharge: number) {
    this.base = base;
    this.perMinute = perMinute;
    this.eBikeCharge = eBikeCharge;
  }

  calculatePrice(trip: Trip): number {
    const durationMinutes = trip.end.getTime() - trip.start.getTime();
    return this.base + durationMinutes * this.perMinute + this.eBikeCharge;
  }
}

export class MonthlyPricing implements PricingStrategy {
  monthlyFee: number;

  constructor(monthlyFee: number) {
    this.monthlyFee = monthlyFee;
  }

  calculatePrice(): number {
    return 0; 
  }
}