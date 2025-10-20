import { NextResponse } from "next/server";
import { TripService } from "@/domain/services/tripService";
import { adminDb } from "@/data/firebaseAdmin";

const tripService = new TripService(adminDb);

export async function GET(
  _req: Request,
  context: { params?: Promise<{ username?: string }> }
) {
  try {
    const { username } = context.params ? await context.params : {};

    let trips;
    if (username) {
      // normal user: only their trips
      trips = await tripService.getUserTrips(username);
    } else {
      // admin: all trips
      trips = await tripService.getAllTrips();
    }

    return NextResponse.json({ ok: true, trips });
  } catch (error: any) {
    console.error("Error fetching trips:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}