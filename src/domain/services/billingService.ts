import { Firestore, Timestamp } from "firebase-admin/firestore";
import { Billing, BillingData, BillingStatus } from "../models/Billing";

export class BillingService {
  constructor(private db: Firestore) {}

  /**
   * Create a new billing record
   */
  async createBilling(data: Omit<BillingData, 'id'>): Promise<Billing> {
    const billingRef = this.db.collection("billings").doc();
    
    const billingData = {
      userId: data.userId,
      email: data.email,
      tripId: data.tripId,
      amount: data.amount,
      description: data.description,
      date: Timestamp.fromDate(data.date),
      status: data.status,
      stripeSessionId: data.stripeSessionId || null,
      stripePaymentIntentId: data.stripePaymentIntentId || null,
    };

    await billingRef.set(billingData);

    return new Billing({
      id: billingRef.id,
      ...data,
    });
  }

  /**
   * Get all billings for a user
   * Note: Results are sorted in-memory to avoid requiring a Firebase composite index
   */
  async getBillingsByEmail(email: string): Promise<Billing[]> {
    const snapshot = await this.db
      .collection("billings")
      .where("email", "==", email)
      .get();

    if (snapshot.empty) {
      return [];
    }

    // Map documents to Billing objects
    const billings = snapshot.docs.map(doc => {
      const data = doc.data();
      return new Billing({
        id: doc.id,
        userId: data.userId,
        email: data.email,
        tripId: data.tripId,
        amount: data.amount,
        description: data.description,
        date: data.date.toDate(),
        status: data.status as BillingStatus,
        stripeSessionId: data.stripeSessionId,
        stripePaymentIntentId: data.stripePaymentIntentId,
      });
    });

    // Sort by date in descending order (most recent first) in-memory
    return billings.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Get a specific billing by ID
   */
  async getBillingById(billingId: string): Promise<Billing | null> {
    const doc = await this.db.collection("billings").doc(billingId).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return new Billing({
      id: doc.id,
      userId: data.userId,
      email: data.email,
      tripId: data.tripId,
      amount: data.amount,
      description: data.description,
      date: data.date.toDate(),
      status: data.status as BillingStatus,
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
    });
  }

  /**
   * Update billing status
   */
  async updateBillingStatus(billingId: string, status: BillingStatus): Promise<void> {
    await this.db.collection("billings").doc(billingId).update({
      status,
    });
  }

  /**
   * Get billing by trip ID
   */
  async getBillingByTripId(tripId: string): Promise<Billing | null> {
    const snapshot = await this.db
      .collection("billings")
      .where("tripId", "==", tripId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return new Billing({
      id: doc.id,
      userId: data.userId,
      email: data.email,
      tripId: data.tripId,
      amount: data.amount,
      description: data.description,
      date: data.date.toDate(),
      status: data.status as BillingStatus,
      stripeSessionId: data.stripeSessionId,
      stripePaymentIntentId: data.stripePaymentIntentId,
    });
  }
}