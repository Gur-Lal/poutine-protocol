import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { TripService } from "@/domain/services/tripService";

const tripService = new TripService(adminDb);

export async function GET() {
    try {
        const trips = await tripService.getAllTrips();
        return NextResponse.json({ ok: true, trips });
    } catch (error) {
        console.error("Error fetching all trips:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}