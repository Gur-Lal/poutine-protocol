import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { StripePaymentService } from "@/domain/services/stripePaymentService";
import { BillingService } from "@/domain/services/billingService";

const paymentService = new StripePaymentService();
const billingService = new BillingService(adminDb);

const DUAL_ROLE_DISCOUNT_RATE = 0.10; // 10% discount for dual-role users

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

    // Fetch user to get pricing plan, userId, role, and activeRole
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
    const role = userData?.role || "rider";
    const activeRole = userData?.activeRole || (role === "dual" ? "rider" : role);
    const tierDiscount = userData?.tierDiscount || 0;

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

    const isEBike = bikeData.isEBike === true;

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

    // Apply tier discount first (if not monthly)
    if (pricingPlan.toLowerCase() !== "monthly" && tierDiscount > 0) {
      amount = amount * (1 - tierDiscount);
    }

    // Check if dual-role discount applies
    const isDualRoleDiscount = role === "dual" && activeRole === "rider" && pricingPlan.toLowerCase() !== "monthly";

    // Apply dual-role discount on top of tier discount
    if (isDualRoleDiscount) {
      amount = amount * (1 - DUAL_ROLE_DISCOUNT_RATE);
    }

    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100;

    let priceBreakdown;

    if (pricingPlan.toLowerCase() === "monthly") {
      priceBreakdown = {
        basePrice: 0,
        perMinutePrice: 0,
        eBikeSurcharge: 0,
        isMonthlySubscription: true,
        total: 0,
        dualRoleDiscount: 0,
        tierDiscount: 0,
      };
    } else {
      let basePrice = 0;
      let perMinuteRate = 0;
      let eBikeSurcharge = 0;

      if (isEBike) {
        basePrice = 2;
        perMinuteRate = 0.15;
        eBikeSurcharge = 1;
      } else {
        basePrice = 1.5;
        perMinuteRate = 0.10;
        eBikeSurcharge = 0;
      }

      priceBreakdown = {
        basePrice: basePrice,
        perMinutePrice: Math.round(durationMinutes * perMinuteRate * 100) / 100,
        eBikeSurcharge: eBikeSurcharge,
        isMonthlySubscription: false,
        total: amount,
        dualRoleDiscount: isDualRoleDiscount ? DUAL_ROLE_DISCOUNT_RATE : 0,
        tierDiscount: tierDiscount,
      };
    }

    // Update trip with price breakdown
    await adminDb.collection("trips").doc(tripId).update({
      priceBreakdown: priceBreakdown
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
        pricingPlan: "Monthly",
        priceBreakdown
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

    const existingBilling = await billingService.getBillingByTripId(tripId);

    if (!existingBilling) {
      // Create billing record with "paid" status
      await billingService.createBilling({
        userId,
        email,
        tripId,
        amount,
        description,
        date: new Date(),
        status: "paid",
      });
    }

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      amount,
      durationMinutes: durationMinutes.toFixed(1),
      pricingPlan: pricingPlan === "regular" ? "Pay-as-you-go" : pricingPlan,
      priceBreakdown
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