import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

type BikeStatus = "available" | "reserved" | "on_trip" | "maintenance";
type StationStatus = "empty" | "occupied" | "full" | "out_of_service";

export async function POST(req: Request) {
    try {
        // Get request body
        const body = await req.json().catch(() => ({}));

        // Check which mode to use
        const mode = body.mode || "full"; // "full" or "single"

        if (mode === "single") {
            // Original single-station seed
            return await seedSingleStation(body);
        } else {
            // New multi-station seed
            return await seedFullDatabase();
        }

    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }
}

// Original single-station seed
async function seedSingleStation(body: any) {
    const stationName = body.stationName || "Test Station";
    const capacity = body.capacity || 5;
    const bikes = body.bikes || 3;
    const expiresAfterMinutes = body.expiresAfterMinutes || 10;

    if (bikes > capacity) {
        return NextResponse.json(
            { ok: false, error: "bikes cannot exceed capacity" },
            { status: 400 }
        );
    }

    // Create station
    const stationRef = adminDb.collection("stations").doc();

    let stationStatus: StationStatus;
    if (bikes <= 0) {
        stationStatus = "empty";
    } else if (bikes >= capacity) {
        stationStatus = "full";
    } else {
        stationStatus = "occupied";
    }

    await stationRef.set({
        name: stationName,
        status: stationStatus,
        capacity: capacity,
        numberOfBikes: bikes,
        coordinatePosition: { latitude: 45.5, longitude: -73.6 },
        address: "123 Test St",
        expiresAfterMinutes: expiresAfterMinutes,
    });

    // Create docks and bikes
    const createdBikeIds: string[] = [];

    for (let i = 0; i < capacity; i++) {
        if (i < bikes) {
            // Occupied dock with bike
            const bikeRef = adminDb.collection("bikes").doc();
            await bikeRef.set({
                status: "available" as BikeStatus,
                isEBike: false,
                stationId: stationRef.id,
            });
            createdBikeIds.push(bikeRef.id);

            await stationRef.collection("docks").doc(`dock-${i + 1}`).set({
                status: "occupied",
                bikeId: bikeRef.id,
            });
        } else {
            // Empty dock
            await stationRef.collection("docks").doc(`dock-${i + 1}`).set({
                status: "empty",
                bikeId: null,
            });
        }
    }

    return NextResponse.json({
        ok: true,
        mode: "single",
        station: { id: stationRef.id, name: stationName, capacity, numberOfBikes: bikes },
        bikes: createdBikeIds.map((id, idx) => ({ id, label: `bike-${idx + 1}` })),
    });
}

// New multi-station seed
async function seedFullDatabase() {
    console.log("Starting full database seed...");

    // Create stations
    const station1 = await createStation({
        name: "Downtown Station",
        capacity: 10,
        bikes: 5,
        address: "123 Main St, Montreal, QC",
        latitude: 45.5017,
        longitude: -73.5673
    });

    const station2 = await createStation({
        name: "University Station",
        capacity: 15,
        bikes: 10,
        address: "456 Campus Ave, Montreal, QC",
        latitude: 45.5048,
        longitude: -73.5772
    });

    const station3 = await createStation({
        name: "Park Station",
        capacity: 8,
        bikes: 3,
        address: "789 Park Rd, Montreal, QC",
        latitude: 45.5088,
        longitude: -73.5878
    });

    // Create test users
    await createTestUsers();

    // Collect results
    const allStations = [station1, station2, station3];
    const allBikes = [
        ...station1.bikes,
        ...station2.bikes,
        ...station3.bikes
    ];

    return NextResponse.json({
        ok: true,
        mode: "full",
        message: "Database seeded successfully!",
        summary: {
            totalStations: allStations.length,
            totalBikes: allBikes.length,
            totalDocks: allStations.reduce((sum, s) => sum + s.station.capacity, 0)
        },
        stations: allStations.map(s => ({
            id: s.station.id,
            name: s.station.name,
            bikes: s.station.numberOfBikes,
            capacity: s.station.capacity
        })),
        users: {
            admin: "admin-user-001",
            rider: "rider-user-001"
        }
    });
}

// Helper function to create a station
async function createStation(data: {
    name: string;
    capacity: number;
    bikes: number;
    address: string;
    latitude: number;
    longitude: number;
}) {
    const name = data.name;
    const capacity = data.capacity;
    const bikes = data.bikes;
    const address = data.address;
    const latitude = data.latitude;
    const longitude = data.longitude;

    if (bikes > capacity) {
        throw new Error(`${name}: bikes cannot exceed capacity`);
    }

    let stationStatus: StationStatus;
    if (bikes <= 0) {
        stationStatus = "empty";
    } else if (bikes >= capacity) {
        stationStatus = "full";
    } else {
        stationStatus = "occupied";
    }

    const stationRef = adminDb.collection("stations").doc();
    await stationRef.set({
        name: name,
        status: stationStatus,
        capacity: capacity,
        numberOfBikes: bikes,
        coordinatePosition: {
            latitude: latitude,
            longitude: longitude
        },
        address: address,
        expiresAfterMinutes: 10
    });

    const createdBikes = [];

    for (let i = 0; i < capacity; i++) {
        const dockNumber = i + 1;

        if (i < bikes) {
            const bikeRef = adminDb.collection("bikes").doc();
            const isEBike = i < Math.floor(bikes * 0.3);

            await bikeRef.set({
                status: "available" as BikeStatus,
                isEBike: isEBike,
                stationId: stationRef.id
            });

            await stationRef.collection("docks").doc(`dock-${dockNumber}`).set({
                status: "occupied",
                bikeId: bikeRef.id
            });

            createdBikes.push({
                id: bikeRef.id,
                type: isEBike ? "e-bike" : "standard",
                stationName: name,
                stationId: stationRef.id
            });
        } else {
            await stationRef.collection("docks").doc(`dock-${dockNumber}`).set({
                status: "empty",
                bikeId: null
            });
        }
    }

    return {
        station: {
            id: stationRef.id,
            name: name,
            capacity: capacity,
            numberOfBikes: bikes,
            address: address
        },
        bikes: createdBikes
    };
}

// Helper function to create test users
async function createTestUsers() {
    const adminUserRef = adminDb.collection("users").doc("admin-user-001");
    const adminUserDoc = await adminUserRef.get();

    if (!adminUserDoc.exists) {
        await adminUserRef.set({
            email: "admin@bikeshare.com",
            displayName: "Admin User",
            role: "admin",
            address: "100 Admin St, Montreal, QC",
            paymentInfo: "visa-****-1234"
        });
    }

    const riderUserRef = adminDb.collection("users").doc("rider-user-001");
    const riderUserDoc = await riderUserRef.get();

    if (!riderUserDoc.exists) {
        await riderUserRef.set({
            email: "rider@bikeshare.com",
            displayName: "Regular Rider",
            role: "rider",
            address: "200 Rider Ave, Montreal, QC",
            paymentInfo: "mastercard-****-5678"
        });
    }
}