import { NextRequest, NextResponse } from "next/server";
import { FirestoreService } from "@/data/firestoreService";

export async function GET(
    request: NextRequest,
    context: { params: { username: string } }
) {
    try {
        const { username } = await context.params;

        console.log("Getting reservation for username:", username);

        const firestoreService = new FirestoreService();
        const reservation = await firestoreService.getReservationByUsername(username);

        console.log("Reservation found:", reservation);

        return NextResponse.json(reservation);
    } catch (error) {
        console.error("Error in getReservation API:", error);
        return NextResponse.json(null);
    }
}