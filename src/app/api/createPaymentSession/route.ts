import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { StripePaymentService } from "@/domain/services/stripePaymentService";
import { RegularPricing, EBikePricing, MonthlyPricing } from "@/domain/models/Pricing";

const paymentService = new StripePaymentService();

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
    
    // Fetch user to get pricing plan
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
    const pricingPlan = userData.pricingPlan || "regular"; // default to regular

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
    let pricingStrategy;

    switch (pricingPlan.toLowerCase()) {
      case "monthly":
        // Monthly subscribers pay $0 per trip
        pricingStrategy = new MonthlyPricing(30); // $30/month but $0 per trip
        amount = 0;
        break;
      case "ebike":
      case "electric":
        pricingStrategy = new EBikePricing(2, 0.15, 1); // $2 base + $0.15/min + $1 e-bike charge
        amount = 2 + (durationMinutes * 0.15) + 1;
        break;
      case "regular":
      default:
        if (isEBike) {
          pricingStrategy = new EBikePricing(2, 0.15, 1);
          amount = 2 + (durationMinutes * 0.15) + 1;
        } else {
          pricingStrategy = new RegularPricing(1.5, 0.10); // $1.50 base + $0.10/min
          amount = 1.5 + (durationMinutes * 0.10);
        }
        break;
    }

    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100;

    // For monthly subscribers, skip payment
    if (pricingPlan.toLowerCase() === "monthly") {
      return NextResponse.json({
        ok: true,
        amount: 0,
        skipPayment: true,
        message: "Monthly subscription - no charge for this trip"
      });
    }

    // Create Stripe checkout session
    const checkoutUrl = await paymentService.createCheckoutSession({
      amount,
      currency: "cad",
      tripId,
      email,
      description: `Bike rental: ${durationMinutes.toFixed(1)} minutes (${isEBike ? 'E-Bike' : 'Regular Bike'})`
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