import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, pricingPlan } = await req.json();

    if (!email || !pricingPlan) {
      return NextResponse.json(
        { ok: false, error: "Email and pricing plan are required" },
        { status: 400 }
      );
    }

    if (!["regular", "monthly"].includes(pricingPlan)) {
      return NextResponse.json(
        { ok: false, error: "Invalid pricing plan" },
        { status: 400 }
      );
    }

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

    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({ pricingPlan });

    return NextResponse.json({
      ok: true,
      message: "Pricing plan updated successfully",
    });
  } catch (error) {
    console.error("Error updating pricing plan:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update pricing plan" },
      { status: 500 }
    );
  }
}