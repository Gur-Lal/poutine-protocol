import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { BillingService } from "@/domain/services/billingService";

const billingService = new BillingService(adminDb);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const billings = await billingService.getBillingsByEmail(email);

    // Convert billings to plain objects for JSON response
    const billingsData = billings.map(billing => ({
      id: billing.id,
      userId: billing.userId,
      email: billing.email,
      tripId: billing.tripId,
      amount: billing.amount,
      description: billing.description,
      date: billing.date.toISOString(),
      status: billing.status,
      stripeSessionId: billing.stripeSessionId,
      stripePaymentIntentId: billing.stripePaymentIntentId,
    }));

    return NextResponse.json({
      ok: true,
      billings: billingsData,
    });
  } catch (error) {
    console.error("Error fetching billings:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}