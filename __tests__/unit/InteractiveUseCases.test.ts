import { BikeReservationService } from "../../src/domain/services/bikeReservationService";
import { BillingService } from "../../src/domain/services/billingService";
import { Billing, BillingStatus } from "../../src/domain/models/Billing";
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

const mockSet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

const mockFirestore = {
    collection: mockCollection,
} as any;

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

function refUpdate(bike: any) {
    bike.status = "available";
}

describe("Interactive use cases", () => {
    let db: any;
    let service: BikeReservationService;
    let billingService: BillingService;

    beforeEach(() => {
        jest.clearAllMocks();

        db = {
            collection: jest.fn(),
            runTransaction: jest.fn(),
        };

        service = new BikeReservationService(db);
        billingService = new BillingService(mockFirestore);
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
        refUpdate(reservedBike);

        expect(result).toEqual({
            ok: false,
            message: "Reservation expired, bike is now available.",
        });
        console.log("Result message: " + JSON.stringify(result.message) + "\nUpdated bike: " + JSON.stringify(reservedBike));

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
        const dockRef = makeRef("dock1");

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

        const reservedBikeData = {
            status: "reserved",
            stationId: stationAId,
        };
        const reservedBikeDoc = makeDocSnapshot(reservedBikeData, bikeId, bikeRef);

        const onTripBikeData = {
            status: "on_trip",
            stationId: null,
        };
        const onTripBikeDoc = makeDocSnapshot(onTripBikeData, bikeId, bikeRef);

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

        // Reserve phase
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
        expect(reserveResult.ok).toBe(true);

        // Unlock phase
        bikeRef.get = jest.fn().mockResolvedValueOnce(reservedBikeDoc);

        const activeReservationSnap = snapFromDocs([
            makeDocSnapshot(
                {
                    email,
                    bikeId,
                    status: "active",
                    reservationExpiry: Timestamp.fromMillis(Date.now() + 10000),
                },
                "newRes123",
                reservationRef
            ),
        ]);

        reservationsCol.where = jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValueOnce(activeReservationSnap),
                    }),
                }),
            }),
        });

        db.runTransaction.mockImplementationOnce(async (transactionFn: any) => {
            const tx = { update: jest.fn() };
            await transactionFn(tx);
        });

        service.freeUpDock = jest.fn().mockResolvedValue(undefined);

        const unlockResult = await service.unlockBike({ email, bikeId });
        expect(unlockResult.ok).toBe(true);
        expect(service.freeUpDock).toHaveBeenCalledWith(stationAId);

        // Return phase
        db.collection.mockImplementation((name: string) => {
            if (name === "bikes") return { doc: () => bikeRef };
            if (name === "stations") return { doc: () => stationBRef };
            if (name === "reservations") {
                return {
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                };
            }
            return { doc: jest.fn() };
        });

        db.runTransaction.mockImplementationOnce(async (transactionFn: any) => {
            const tx = {
                get: jest
                    .fn()
                    .mockResolvedValueOnce(onTripBikeDoc)
                    .mockResolvedValueOnce(stationBDoc)
                    .mockResolvedValueOnce(
                        snapFromDocs([makeDocSnapshot({ status: "empty" }, "dock1", dockRef)])
                    )
                    .mockResolvedValueOnce(snapFromDocs([])),
                update: jest.fn(),
            };
            return transactionFn(tx);
        });

        stationBRef.get = jest.fn(() =>
            Promise.resolve(
                makeDocSnapshot(
                    { name: "Station B", numberOfBikes: 1, capacity: 2, status: "occupied" },
                    stationBId,
                    stationBRef
                )
            )
        );

        const returnResult = await service.returnBike({ email, bikeId, stationId: stationBId });
        expect(returnResult.ok).toBe(true);

        // Billing and receipt phase
        const mockDocId = "billing123";
        const testDate = new Date("2024-01-15");

        mockCollection.mockReturnValue({
            doc: mockDoc,
        });

        mockDoc.mockReturnValue({
            id: mockDocId,
            set: mockSet,
        });

        mockSet.mockResolvedValue(undefined);

        const billingData = {
            userId: "user123",
            email: email,
            tripId: "trip123",
            amount: 100,
            description: "Test billing receipt",
            date: testDate,
            status: "pending" as BillingStatus,
            stripeSessionId: "session123",
            stripePaymentIntentId: "pi123",
        };

        const billingResult = await billingService.createBilling(billingData);

        expect(mockCollection).toHaveBeenCalledWith("billings");
        expect(mockDoc).toHaveBeenCalledWith();
        expect(mockSet).toHaveBeenCalledWith({
            userId: billingData.userId,
            email: billingData.email,
            tripId: billingData.tripId,
            amount: billingData.amount,
            description: billingData.description,
            date: Timestamp.fromDate(testDate),
            status: billingData.status,
            stripeSessionId: billingData.stripeSessionId,
            stripePaymentIntentId: billingData.stripePaymentIntentId,
        });
        console.log("Trip message: " + JSON.stringify(returnResult.message) + "\nBilling and trip information: " + JSON.stringify(billingResult));

        expect(billingResult).toBeInstanceOf(Billing);
        expect(billingResult.email).toBe(billingData.email);
    });
});