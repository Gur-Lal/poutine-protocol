import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";
import { TripService } from "@/domain/services/tripService";

const tripService = new TripService(adminDb);

export async function GET(request: NextRequest) {
    try {
        // Get query parameters
        const userId = request.nextUrl.searchParams.get("userId");
        const email = request.nextUrl.searchParams.get("email");

        // If no userId provided, return all trips
        if (!userId || !email) {
            const trips = await tripService.getAllTrips();
            return NextResponse.json({ ok: true, trips });
        }

        // Get user role information
        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const role = userData?.role || "rider";
        const activeRole = userData?.activeRole || (role === "dual" ? "rider" : role);

        // Find trips to return based on role
        let trips;

        if (role === "admin" || role === "operator" || (role === "dual" && activeRole === "operator")) {
            // Return ALL trips for admin/operator or dual-role in operator mode
            trips = await tripService.getAllTrips();
        } else {
            // Return only user's trips for riders or dual-role in rider mode
            trips = await tripService.getUserTrips(email);
        }

        return NextResponse.json({
            ok: true,
            trips,
            role,
            activeRole,
            isDualRole: role === "dual",
            showingAllTrips: role === "admin" || role === "operator" || (role === "dual" && activeRole === "operator")
        });
    } catch (error) {
        console.error("Error fetching trips:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}