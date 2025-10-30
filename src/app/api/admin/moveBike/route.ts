import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "@/domain/services/adminService";

export async function POST(request: NextRequest) {
    try {
        // Get the data from the request
        const body = await request.json();
        const bikeId = body.bikeId;
        const sourceStationId = body.sourceStationId;
        const destinationStationId = body.destinationStationId;

        const adminService = new AdminService(adminDb);

        const result = await adminService.moveBike({
            bikeId: bikeId,
            sourceStationId: sourceStationId,
            destinationStationId: destinationStationId,
        });

        return NextResponse.json(result);
    }

    catch (error) {
        console.error("Error moving bike:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}