import { NextResponse} from "next/server";
import { BikeReservationService } from "@/domain/services/bikeReservationService";
import { TripService } from "@/domain/services/tripService";
import {adminDb} from "@/data/firebaseAdmin";

const service = new BikeReservationService(adminDb);
const tripService = new TripService(adminDb);

export async function POST(req: Request){
    try{
        const { username, bikeId, stationId} = await req.json();

        // Return bike 
        const result = await service.returnBike({username, bikeId, stationId});

        // End trip 
        const trip = await tripService.endTrip(username, bikeId, stationId);
        
        return NextResponse.json({ ok: true, data: { ...result, trip } });
    } catch (error: any){
        return NextResponse.json({ ok: false, error: error.message}, {status: 500});
    }
}