import {NextResponse, NextRequest } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

const service = new FirestoreService();

export async function GET(req : NextRequest, {params}:{ params: {collectionName: string}}) {
    try {
        //console.log(params);

        const {collectionName} = await params;
        const result = await service.getDocuments(collectionName);
        return NextResponse.json(result);
    } catch  (e: any) {
        return NextResponse.json({ok:false, error: e.message }, {status: 400});
    }
}