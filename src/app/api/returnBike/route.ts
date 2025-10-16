import { NextResponse} from "next/server";
import { BikeReservationService } from "@/domain/services/bikeReservationService";
import {adminDb} from "@/data/firebaseAdmin";
const service = new BikeReservationService(adminDb);

export async function POST(req: Request){
    try{
        const { username, bikeId, stationId} = await req.json();

        const result = await service.returnBike({username, bikeId, stationId});

        return NextResponse.json(result);
    } catch (error: any){
        return NextResponse.json({ ok: false, error: error.message}, {status: 500});
    }
}