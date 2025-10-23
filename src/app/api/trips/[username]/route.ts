import { NextResponse } from "next/server";
import { TripService } from "@/domain/services/tripService";
import { adminDb } from "@/data/firebaseAdmin";

const tripService = new TripService(adminDb);

export async function GET(
    _req: Request,
    context: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await context.params;

        if (!username) {
            return NextResponse.json({ ok: false, error: "Username is required" }, { status: 400 });
        }

        const trips = await tripService.getUserTrips(username);
        return NextResponse.json({ ok: true, trips });
    } catch (error) {
        console.error("Error fetching user trips:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}