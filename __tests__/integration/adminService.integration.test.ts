import { adminDb } from "@/data/firebaseAdmin";
import { AdminService } from "../../src/domain/services/adminService";

describe("setBikeMaintenance Integration Tests", () => {
    let adminService: AdminService;
    let testBikeId: string;
    let testStationId: string;
    let testDockId: string;

    beforeAll(async () => {
        adminService = new AdminService(adminDb);
    });

    beforeEach(async () => {
        testStationId = `test-station-${Date.now()}`;
        await adminDb.collection("stations").doc(testStationId).set({
            name: "Test Station",
            capacity: 10,
            numberOfBikes: 5,
            status: "occupied",
            location: { lat: 45.5017, lng: -73.5673 },
        });

        testDockId = `test-dock-${Date.now()}`;
        await adminDb
            .collection("stations")
            .doc(testStationId)
            .collection("docks")
            .doc(testDockId)
            .set({
                status: "occupied",
                bikeId: null,
            });

        testBikeId = `test-bike-${Date.now()}`;
        await adminDb.collection("bikes").doc(testBikeId).set({
            model: "Test Model",
            status: "available",
            stationId: testStationId,
            batteryLevel: 100,
        });

        await adminDb
            .collection("stations")
            .doc(testStationId)
            .collection("docks")
            .doc(testDockId)
            .update({
                bikeId: testBikeId,
            });
    });

    afterEach(async () => {
        if (testBikeId) {
            await adminDb.collection("bikes").doc(testBikeId).delete();
        }
        if (testStationId) {
            const docksSnapshot = await adminDb
                .collection("stations")
                .doc(testStationId)
                .collection("docks")
                .get();

            for (const doc of docksSnapshot.docs) {
                await doc.ref.delete();
            }

            await adminDb.collection("stations").doc(testStationId).delete();
        }
    });

    test("should send bike to maintenance and update station/dock correctly", async () => {
        const result = await adminService.setBikeMaintenance({
            bikeId: testBikeId,
            inMaintenance: true,
        });

        expect(result.ok).toBe(true);
        expect(result.message).toBe("Bike sent to maintenance");

        const bikeDoc = await adminDb.collection("bikes").doc(testBikeId).get();
        const bike = bikeDoc.data();
        expect(bike?.status).toBe("maintenance");

        const stationDoc = await adminDb.collection("stations").doc(testStationId).get();
        const station = stationDoc.data();
        expect(station?.numberOfBikes).toBe(4);
        expect(station?.status).toBe("occupied");

        const dockDoc = await adminDb
            .collection("stations")
            .doc(testStationId)
            .collection("docks")
            .doc(testDockId)
            .get();
        const dock = dockDoc.data();
        expect(dock?.status).toBe("empty");
        expect(dock?.bikeId).toBeNull();
    });

    test("should remove bike from maintenance and update station/dock correctly", async () => {
        await adminService.setBikeMaintenance({
            bikeId: testBikeId,
            inMaintenance: true,
        });

        let bikeDoc = await adminDb.collection("bikes").doc(testBikeId).get();
        expect(bikeDoc.data()?.status).toBe("maintenance");

        const result = await adminService.setBikeMaintenance({
            bikeId: testBikeId,
            inMaintenance: false,
        });

        expect(result.ok).toBe(true);
        expect(result.message).toBe("Bike removed from maintenance");

        bikeDoc = await adminDb.collection("bikes").doc(testBikeId).get();
        const bike = bikeDoc.data();
        expect(bike?.status).toBe("available");

        const stationDoc = await adminDb.collection("stations").doc(testStationId).get();
        const station = stationDoc.data();
        expect(station?.numberOfBikes).toBe(5);

        const emptyDocksSnapshot = await adminDb
            .collection("stations")
            .doc(testStationId)
            .collection("docks")
            .where("status", "==", "occupied")
            .where("bikeId", "==", testBikeId)
            .get();

        expect(emptyDocksSnapshot.empty).toBe(false);
        const occupiedDock = emptyDocksSnapshot.docs[0].data();
        expect(occupiedDock.status).toBe("occupied");
        expect(occupiedDock.bikeId).toBe(testBikeId);
    });
});

describe("setStationService Integration Tests", () => {
    let adminService: AdminService;
    let testStationId: string;

    beforeAll(async () => {
        await adminDb.listCollections();
        adminService = new AdminService(adminDb);
    });

    afterAll(async () => {
        await adminDb.terminate();
    });

    beforeEach(async () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        testStationId = `test-station-${timestamp}-${random}`;

        await adminDb.collection("stations").doc(testStationId).set({
            name: "Test Station",
            capacity: 10,
            numberOfBikes: 5,
            status: "occupied",
            location: { lat: 45.5017, lng: -73.5673 },
        });
    });

    afterEach(async () => {
        try {
            if (testStationId) {
                await adminDb.collection("stations").doc(testStationId).delete();
            }
        } catch (error) {
            console.error("Cleanup error:", error);
        }
    });

    test("should mark station as out of service", async () => {
        const result = await adminService.setStationService({
            stationId: testStationId,
            outOfService: true,
        });

        expect(result.ok).toBe(true);
        expect(result.message).toBe("Station marked as out of service");

        const stationDoc = await adminDb.collection("stations").doc(testStationId).get();
        const station = stationDoc.data();
        expect(station?.status).toBe("out_of_service");
    });

    test("should restore station to service with correct status based on bike count", async () => {
        await adminService.setStationService({
            stationId: testStationId,
            outOfService: true,
        });

        let stationDoc = await adminDb.collection("stations").doc(testStationId).get();
        expect(stationDoc.data()?.status).toBe("out_of_service");

        const result = await adminService.setStationService({
            stationId: testStationId,
            outOfService: false,
        });

        expect(result.ok).toBe(true);
        expect(result.message).toBe("Station restored to service");

        stationDoc = await adminDb.collection("stations").doc(testStationId).get();
        const station = stationDoc.data();
        expect(station?.status).toBe("occupied");
    });
});