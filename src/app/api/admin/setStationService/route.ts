import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "@/domain/services/adminService";

export async function POST(request: NextRequest) {
    try {
        // Get the data from the request
        const body = await request.json();
        const stationId = body.stationId;
        const outOfService = body.outOfService;

        const adminService = new AdminService(adminDb);

        // Set station service status
        const result = await adminService.setStationService({
            stationId: stationId,
            outOfService: outOfService,
        });

        return NextResponse.json(result);
    }

    catch (error) {
        console.error("Error setting station service:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}