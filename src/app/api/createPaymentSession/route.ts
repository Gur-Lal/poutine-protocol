import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { StripePaymentService } from "@/domain/services/stripePaymentService";
import { BillingService } from "@/domain/services/billingService";

const paymentService = new StripePaymentService();
const billingService = new BillingService(adminDb);

export async function POST(req: Request) {
  try {
    const { tripId, email } = await req.json();

    // Fetch trip data
    const tripDoc = await adminDb.collection("trips").doc(tripId).get();
    
    if (!tripDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "Trip not found" },
        { status: 404 }
      );
    }

    const tripData = tripDoc.data();
    
    if (!tripData) {
      return NextResponse.json(
        { ok: false, error: "Trip data not found" },
        { status: 404 }
      );
    }
    
    // Fetch user to get pricing plan and userId
    const userSnapshot = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;
    const pricingPlan = userData.pricingPlan || "regular";

    // Fetch bike to determine if it's an e-bike
    const bikeDoc = await adminDb.collection("bikes").doc(tripData.bikeId).get();
    
    if (!bikeDoc.exists) {
      return NextResponse.json(
        { ok: false, error: "Bike not found" },
        { status: 404 }
      );
    }
    
    const bikeData = bikeDoc.data();
    
    if (!bikeData) {
      return NextResponse.json(
        { ok: false, error: "Bike data not found" },
        { status: 404 }
      );
    }
    
    const isEBike = bikeData.type === "electric";

    // Calculate trip cost based on pricing plan
    const startTime = tripData.startTime.toDate();
    const endTime = tripData.endTime.toDate();
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    let amount = 0;

    switch (pricingPlan.toLowerCase()) {
      case "monthly":
        // Monthly subscribers pay $0 per trip
        amount = 0;
        break;
      case "ebike":
      case "electric":
        amount = 2 + (durationMinutes * 0.15) + 1; // $2 base + $0.15/min + $1 e-bike charge
        break;
      case "regular":
      default:
        if (isEBike) {
          amount = 2 + (durationMinutes * 0.15) + 1;
        } else {
          amount = 1.5 + (durationMinutes * 0.10); // $1.50 base + $0.10/min
        }
        break;
    }

    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100;

    // Update trip with cost
    await adminDb.collection("trips").doc(tripId).update({
      cost: amount
    });

    const description = `Bike rental: ${durationMinutes.toFixed(1)} minutes (${isEBike ? 'E-Bike' : 'Regular Bike'}) - ${tripData.startStationName || 'Unknown'} to ${tripData.endStationName || 'Unknown'}`;

    // For monthly subscribers, create a $0 billing record and skip payment
    if (pricingPlan.toLowerCase() === "monthly") {
      await billingService.createBilling({
        userId,
        email,
        tripId,
        amount: 0,
        description,
        date: new Date(),
        status: "paid", // Monthly subscriptions are already paid
      });

      return NextResponse.json({
        ok: true,
        amount: 0,
        skipPayment: true,
        message: "Monthly subscription - no charge for this trip",
        durationMinutes: durationMinutes.toFixed(1),
        pricingPlan
      });
    }

    // Create Stripe checkout session
    const checkoutUrl = await paymentService.createCheckoutSession({
      amount,
      currency: "cad",
      tripId,
      email,
      description
    });

    // Create billing record with "pending" status
    await billingService.createBilling({
      userId,
      email,
      tripId,
      amount,
      description,
      date: new Date(),
      status: "paid",  // ← Changed from "pending"
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      amount,
      durationMinutes: durationMinutes.toFixed(1),
      pricingPlan
    });
  } catch (error) {
    console.error("Error creating payment session:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}