import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "@/domain/services/adminService";

export async function POST(request: NextRequest) {
    try {
        const adminService = new AdminService(adminDb);

        // Reset the system
        const result = await adminService.resetSystem();

        // Return the result
        return NextResponse.json(result);
    }

    catch (error) {
        console.error("Error resetting system:", error);

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