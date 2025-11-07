import { NextResponse } from "next/server";
import { BikeReservationService } from "@/domain/services/bikeReservationService";
import { TripService } from "@/domain/services/tripService";
import { adminDb } from "@/data/firebaseAdmin";
import { bmsCore } from "@/lib/server-services";

const service = new BikeReservationService(adminDb);
const tripService = new TripService(adminDb);

export async function POST(req: Request) {
    try {
        const { email, bikeId, stationId } = await req.json();

        const result = await service.returnBike({ email, bikeId, stationId });

        // Fetch station name for endTrip
        const stationDoc = await adminDb.collection("stations").doc(stationId).get();

        if (!stationDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "Station not found" },
                { status: 404 }
            );
        }

        const stationData = stationDoc.data();
        const stationName = stationData?.name || "Unknown Station";

        const trip = await tripService.endTrip(email, bikeId, stationId, stationName);

        bmsCore.publishReservation(email, bikeId, 'RETURNED');
        await bmsCore.publishStations();

        // Return trip ID for payment processing
        return NextResponse.json({
            ok: true,
            data: {
                ...result,
                trip,
                tripId: trip?.id
            }
        });
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}