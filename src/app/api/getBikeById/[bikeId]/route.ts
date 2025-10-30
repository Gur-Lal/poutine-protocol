import { NextResponse, NextRequest } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

const service = new FirestoreService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ bikeId: string }> }) {
    try {
        const { bikeId } = await params;
        const result = await service.getBikeById(bikeId);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}