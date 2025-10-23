import { NextResponse } from "next/server";
import { BikeReservationService } from "../../../domain/services/bikeReservationService";
import { adminDb } from "@/data/firebaseAdmin";

const service = new BikeReservationService(adminDb);

export async function POST(req: Request) {
    try {
        const { username, stationName, bikeId } = await req.json();
        const result = await service.reserveBike({ username, stationName, bikeId });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}