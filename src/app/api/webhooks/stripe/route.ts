import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { BillingService } from "@/domain/services/billingService";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover',
});

const billingService = new BillingService(adminDb);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tripId = session.metadata?.tripId;

        if (tripId) {
          // Find the billing record for this trip
          const billing = await billingService.getBillingByTripId(tripId);
          
          if (billing) {
            // Update billing status to paid
            await billingService.updateBillingStatus(billing.id, "paid");
            console.log(`Billing ${billing.id} marked as paid for trip ${tripId}`);
          }
        }
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
        const tripId = session.metadata?.tripId;

        if (tripId) {
          // Find the billing record for this trip
          const billing = await billingService.getBillingByTripId(tripId);
          
          if (billing) {
            // Update billing status to failed
            await billingService.updateBillingStatus(billing.id, "failed");
            console.log(`Billing ${billing.id} marked as failed for trip ${tripId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}