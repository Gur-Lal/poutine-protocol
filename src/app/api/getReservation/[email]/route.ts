import { NextRequest, NextResponse } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ email: string }> }
) {
    try {
        const { email } = await context.params;

        console.log("Getting reservation for email:", email);

        const firestoreService = new FirestoreService();
        const reservation = await firestoreService.getReservationByEmail(email);

        console.log("Reservation found:", reservation);

        return NextResponse.json(reservation);
    } catch (error) {
        console.error("Error in getReservation API:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 }
        );
    }
}