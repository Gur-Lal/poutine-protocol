import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin"; // your admin SDK init

type BikeStatus = "available" | "reserved" | "on_trip" | "maintenance";

export async function POST(req: Request) {
    try {
        const { stationName = "Test Station", capacity = 5, bikes = 3, expiresAfterMinutes = 10 } =
        await req.json();

        if (bikes > capacity) {
        return NextResponse.json({ ok: false, error: "bikes cannot exceed capacity" }, { status: 400 });
        }

        // 1) create station
        const stationRef = adminDb.collection("stations").doc(); // random id
        await stationRef.set({
        name: stationName,
        status: bikes <= 0 ? "empty" : bikes >= capacity ? "full" : "occupied",
        capacity,
        numberOfBikes: bikes,
        coordinatePosition: { latitude: 45.5, longitude: -73.6 },
        address: "123 Test St ",
        expiresAfterMinutes,
        });

        // 2) create docks subcollection
        const docksCol = stationRef.collection("docks");
        const createdBikeIds: string[] = [];

        for (let i = 0; i < capacity; i++) {
        if (i < bikes) {
            // occupied dock + bike
            const bikeRef = adminDb.collection("bikes").doc();
            await bikeRef.set({
            status: "available" as BikeStatus,
            isEBike: false,
            stationId: stationRef.id,
            });
            createdBikeIds.push(bikeRef.id);

            await docksCol.doc(`dock-${i + 1}`).set({
            status: "occupied",
            bikeId: bikeRef.id,
            });
        } else {
            // empty dock
            await docksCol.doc(`dock-${i + 1}`).set({
            status: "empty",
            bikeId: null,
            });
        }
        }

        return NextResponse.json({
        ok: true,
        station: { id: stationRef.id, name: stationName, capacity, numberOfBikes: bikes },
        bikes: createdBikeIds.map((id, idx) => ({ id, label: `bike-${idx + 1}` })),
        
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
