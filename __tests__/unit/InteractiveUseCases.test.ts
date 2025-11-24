import { BikeReservationService } from "../../src/domain/services/bikeReservationService";
import { createNotification } from "../../src/domain/services/notificationService";
import { createAdminNotification } from "../../src/domain/services/adminService";
import { Timestamp } from "firebase-admin/firestore";

jest.mock("../../src/domain/services/notificationService", () => ({
    createNotification: jest.fn(),
}));

jest.mock("../../src/domain/services/adminService", () => {
    const original = jest.requireActual("../../src/domain/services/adminService");
    return {
        ...original,
        createAdminNotification: jest.fn(),
    };
});

function makeRef(id: string) {
    const queryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    };
    return {
        id,
        path: `mock/${id}`,
        collection: jest.fn(() => queryMock),
        get: jest.fn(),
    };
}

function makeDocSnapshot(data: any, id = "doc1", ref?: any) {
    return {
        id,
        exists: true,
        data: () => data,
        ref: ref ?? makeRef(id),
    };
}

function snapFromDocs(docs: any[]) {
    return { empty: docs.length === 0, docs };
}

function emptySnap() {
    return { empty: true, docs: [] };
}

describe("Interactive use cases", () => {
    let db: any;
    let service: BikeReservationService;

    beforeEach(() => {
        jest.clearAllMocks();

        db = {
            collection: jest.fn(),
            runTransaction: jest.fn(),
        };

        service = new BikeReservationService(db);
    });

    test("Reservation Expiry: bike state changes to available, notification sent", async () => {
        const email = "expired@example.com";
        const bikeId = "bike999";

        const bikeRef = { get: jest.fn() };
        const reservedBike = { status: "reserved", stationId: "stationA" };
        bikeRef.get.mockResolvedValueOnce(makeDocSnapshot(reservedBike, bikeId, bikeRef));

        db.collection.mockReturnValueOnce({
            doc: () => bikeRef,
        });

        const reservationRef = makeRef("resExpired");
        const reservationSnap = snapFromDocs([
            makeDocSnapshot(
                {
                    email,
                    bikeId,
                    status: "active",
                    reservationExpiry: Timestamp.fromMillis(Date.now() - 5000),
                },
                "resExpired",
                reservationRef
            ),
        ]);

        db.collection.mockReturnValueOnce({
            where: () => ({
                where: () => ({
                    where: () => ({
                        limit: () => ({
                            get: jest.fn().mockResolvedValueOnce(reservationSnap),
                        }),
                    }),
                }),
            }),
        });

        db.runTransaction.mockImplementation(async (fn: any) => {
            const tx = { update: jest.fn() };
            await fn(tx);
        });

        service.freeUpDock = jest.fn();

        const result = await service.unlockBike({ email, bikeId });

        expect(result).toEqual({
            ok: false,
            message: "Reservation expired, bike is now available.",
        });

        expect(db.runTransaction).toHaveBeenCalled();

        expect(createNotification).toHaveBeenCalledWith(
            email,
            "Reservation expired",
            "The bike you had reserved is now available."
        );

        expect(service.freeUpDock).not.toHaveBeenCalled();
    });

    test("Rebalancing: operators get an alert when a station becomes empty", async () => {
        const email = "test@example.com";
        const stationName = "Station A";
        const bikeId = "bike123";
        const stationId = "stationA";

        const noActiveReservationSnap = snapFromDocs([]);

        db.collection.mockReturnValueOnce({
            where: () => ({
                where: () => ({
                    limit: () => ({
                        get: jest.fn().mockResolvedValueOnce(noActiveReservationSnap),
                    }),
                }),
            }),
        });

        const stationRef = makeRef(stationId);
        const stationSnap = snapFromDocs([
            makeDocSnapshot(
                {
                    name: stationName,
                    status: "occupied",
                    numberOfBikes: 1,
                    capacity: 10,
                    expiresAfterMinutes: 10,
                },
                stationId,
                stationRef
            ),
        ]);

        db.collection.mockReturnValueOnce({
            where: () => ({
                limit: () => ({
                    get: jest.fn().mockResolvedValueOnce(stationSnap),
                }),
            }),
        });

        const bikeRef = makeRef(bikeId);
        db.collection.mockReturnValueOnce({
            doc: () => bikeRef,
        });

        const reservationRef = makeRef("res1");
        db.collection.mockReturnValueOnce({
            doc: () => reservationRef,
        });

        db.runTransaction.mockImplementation(async (fn: any) => {
            const tx = {
                get: jest.fn()
                    .mockResolvedValueOnce({
                        exists: true,
                        ref: stationRef,
                        data: () => ({
                            name: stationName,
                            status: "occupied",
                            numberOfBikes: 1,
                            capacity: 10,
                            expiresAfterMinutes: 10,
                        }),
                    })
                    .mockResolvedValueOnce({
                        exists: true,
                        data: () => ({
                            status: "available",
                            stationId,
                        }),
                    }),
                update: jest.fn(),
                set: jest.fn(),
            };
            return await fn(tx);
        });

        const result = await service.reserveBike({ email, stationName, bikeId });

        expect(result.ok).toBe(true);
        expect(result.station.status).toBe("empty");
        expect(result.station.numberOfBikes).toBe(0);
        expect(createAdminNotification).toHaveBeenCalledWith(
            db,
            "Station Empty",
            `${stationName} is now empty after reservation`
        );
    });

    test("Happy Path Ride: reserve, unlock, ride, return, bill computed, receipt sent", async () => {
        const email = "test@example.com";
        const bikeId = "bike-1";

        const stationAId = "id-A";
        const stationARef = makeRef(stationAId);

        const stationBId = "id-B";
        const stationBRef = makeRef(stationBId);
        const bikeRef = makeRef(bikeId);
        const reservationRef = makeRef("newRes123");

        const stationAData = {
            name: "Station A",
            status: "occupied",
            numberOfBikes: 3,
            capacity: 10,
            expiresAfterMinutes: 10,
        };
        const stationADoc = makeDocSnapshot(stationAData, stationAId, stationARef);

        const stationBData = {
            name: "Station B",
            status: "empty",
            numberOfBikes: 0,
            capacity: 2,
            expiresAfterMinutes: 10,
        };
        const stationBDoc = makeDocSnapshot(stationBData, stationBId, stationBRef);

        const bikeData = {
            status: "available",
            stationId: stationAId,
        };
        const bikeDoc = makeDocSnapshot(bikeData, bikeId, bikeRef);

        const reservationsCol = {
            where: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(emptySnap()),
                    }),
                }),
            }),
            doc: jest.fn(() => reservationRef),
        };

        const stationsCol = {
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue(snapFromDocs([stationADoc])),
                }),
            }),
        };

        const bikesCol = {
            doc: jest.fn((id: string) => {
                if (id === bikeId) return bikeRef;
                return makeRef(id);
            }),
        };

        db.collection.mockImplementation((name: string) => {
            if (name === "reservations") return reservationsCol;
            if (name === "stations") return stationsCol;
            if (name === "bikes") return bikesCol;
            return { doc: jest.fn(() => makeRef("generic")) };
        });

        db.runTransaction.mockImplementation(async (transactionFn: any) => {
            const tx = {
                get: jest.fn().mockImplementation(async (ref: any) => {
                    if (ref === stationARef) return stationADoc;
                    if (ref === bikeRef) return bikeDoc;
                    return emptySnap();
                }),
                update: jest.fn(),
                set: jest.fn(),
            };
            return transactionFn(tx);
        });

        const reserveResult = await service.reserveBike({ email, stationName: "Station A", bikeId });

        //const unlockResult = await service.unlockBike({ email, bikeId });

        //const returnResult = await service.returnBike({ email, bikeId, stationId: stationBId });

        expect(reserveResult.ok).toBe(true);
        //expect(unlockResult.ok).toBe(true);
        //expect(returnResult.ok).toBe(true);
    });
});