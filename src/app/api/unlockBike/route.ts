import { NextResponse } from "next/server";
import { BikeReservationService } from "@/domain/services/bikeReservationService";
import { TripService } from "@/domain/services/tripService";
import { adminDb } from "@/data/firebaseAdmin";

const service = new BikeReservationService(adminDb);
const tripService = new TripService(adminDb);

export async function POST(req: Request) {
    try {
        const { username, bikeId } = await req.json();

        const result = await service.unlockBike({ username, bikeId });

        const trip = await tripService.startTrip(username, bikeId);

        return NextResponse.json({ ok: true, data: { ...result, trip } });
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}