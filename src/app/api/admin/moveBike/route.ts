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

        // Create an admin service
        const adminService = new AdminService(adminDb);

        // Move the bike
        const result = await adminService.moveBike({
            bikeId: bikeId,
            sourceStationId: sourceStationId,
            destinationStationId: destinationStationId,
        });

        // Return the result
        return NextResponse.json(result);
    }

    catch (error) {
        console.error("Error moving bike:", error);

        // Get error message
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        // Return error response
        return NextResponse.json(
            { ok: false, error: errorMessage },
            { status: 500 }
        );
    }
}