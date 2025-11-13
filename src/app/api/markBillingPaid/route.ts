import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { BillingService } from "@/domain/services/billingService";

const billingService = new BillingService(adminDb);

export async function POST(req: Request) {
  try {
    const { tripId } = await req.json();

    if (!tripId) {
      return NextResponse.json(
        { ok: false, error: "tripId is required" },
        { status: 400 }
      );
    }

    const billing = await billingService.getBillingByTripId(tripId);

    if (!billing) {
      console.warn(`No billing found for trip ${tripId}`);
      return NextResponse.json({
        ok: true,
        message: "No billing to update"
      });
    }

    await billingService.updateBillingStatus(billing.id, "paid");

    return NextResponse.json({
      ok: true,
      message: "Billing marked as paid",
      billingId: billing.id
    });
  } catch (error) {
    console.error("Error marking billing as paid:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}