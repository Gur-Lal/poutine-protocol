import {NextResponse } from "next/server";
import { BikeReservationService } from "../../../domain/services/bikeReservationService";
import {adminDb} from "@/data/firebaseAdmin";

const service = new BikeReservationService(adminDb);

export async function POST(req: Request) {
    try {
        const {username, stationName, bikeId} = await req.json();
        const result = await service.reserveBike({ username, stationName, bikeId});
        return NextResponse.json(result);
    } catch  (e: any) {
        return NextResponse.json({ok:false, error: e.message }, {status: 400});
    }
}