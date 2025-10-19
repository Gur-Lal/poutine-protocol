import {NextResponse, NextRequest } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

const service = new FirestoreService();

export async function GET(req : NextRequest, {params}:{ params: {stationId: string}}) {
    try {
        //console.log(params);

        const {stationId} = await params;
        const result = await service.getBikesByStationId(stationId);
        return NextResponse.json(result);
    } catch  (e: any) {
        return NextResponse.json({ok:false, error: e.message }, {status: 400});
    }
}