import { NextResponse } from "next/server";
import { TripService } from "@/domain/services/tripService";
import { adminDb } from "@/data/firebaseAdmin";

const tripService = new TripService(adminDb);

export async function GET(
    _req: Request,
    context: { params: Promise<{ email: string }> }
) {
    try {
        const { email } = await context.params;

        if (!email) {
            return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
        }

        const trips = await tripService.getUserTrips(email);
        return NextResponse.json({ ok: true, trips });
    } catch (error) {
        console.error("Error fetching user trips:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}