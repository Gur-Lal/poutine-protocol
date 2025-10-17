import {NextResponse, NextRequest } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

const service = new FirestoreService();

export async function GET(req : NextRequest, {params}:{ params: {username: string}}) {
    try {
        //console.log(params);

        const {username} = await params;
        const result = await service.getReservationByUsername(username);
        return NextResponse.json(result);
    } catch  (e: any) {
        return NextResponse.json({ok:false, error: e.message }, {status: 400});
    }
}