import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "@/domain/services/adminService";

export async function POST(request: NextRequest) {
    try {
        const adminService = new AdminService(adminDb);

        const result = await adminService.resetSystem();

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error resetting system:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}