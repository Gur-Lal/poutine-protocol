import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "@/domain/services/adminService";

export async function POST(request: NextRequest) {
    try {
        // Get the data from the request
        const body = await request.json();
        const bikeId = body.bikeId;
        const inMaintenance = body.inMaintenance

        const adminService = new AdminService(adminDb);

        // Set bike maintenance status
        const result = await adminService.setBikeMaintenance({
            bikeId: bikeId,
            inMaintenance: inMaintenance,
        });

        // Return the result
        return NextResponse.json(result);
    }

    catch (error) {
        console.error("Error setting bike maintenance:", error);

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