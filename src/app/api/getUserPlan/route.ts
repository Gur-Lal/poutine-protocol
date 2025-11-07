import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

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

    return NextResponse.json({
      ok: true,
      pricingPlan: userData.pricingPlan || "regular",
    });
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch pricing plan" },
      { status: 500 }
    );
  }
}