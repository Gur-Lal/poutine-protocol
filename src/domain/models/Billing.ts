import { PriceBreakdown } from "./PriceBreakdown";

export type BillingStatus = "pending" | "paid" | "failed";

export interface BillingData {
  id?: string;
  userId: string;
  email: string;
  tripId: string;
  amount: number;
  description: string;
  date: Date;
  status: BillingStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  priceBreakdown?: PriceBreakdown;
}

export class Billing {
  id: string;
  userId: string;
  email: string;
  tripId: string;
  amount: number;
  description: string;
  date: Date;
  status: BillingStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
priceBreakdown?: PriceBreakdown;

  constructor(data: BillingData & { id: string }) {
    this.id = data.id;
    this.userId = data.userId;
    this.email = data.email;
    this.tripId = data.tripId;
    this.amount = data.amount;
    this.description = data.description;
    this.date = data.date;
    this.status = data.status;
    this.stripeSessionId = data.stripeSessionId;
    this.stripePaymentIntentId = data.stripePaymentIntentId;
    this.priceBreakdown = data.priceBreakdown;
  }

  isPaid(): boolean {
    return this.status === "paid";
  }

  markAsPaid(): void {
    this.status = "paid";
  }

  markAsFailed(): void {
    this.status = "failed";
  }
}