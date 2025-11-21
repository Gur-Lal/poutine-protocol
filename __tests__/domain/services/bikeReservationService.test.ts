import { BikeReservationService } from "../../../src/domain/services/bikeReservationService";
import { createNotification } from "../../../src/domain/services/notificationService";
import { Timestamp } from "firebase-admin/firestore";

jest.mock("../../../src/domain/services/notificationService", () => ({
    createNotification: jest.fn(),
}));

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

function emptySnap() {
    return { empty: true, docs: [] };
}

function snapFromDocs(docs: any[]) {
    return { empty: docs.length === 0, docs };
}

describe("BikeReservationService.reserveBike", () => {
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

    test("throws error when user already has an active reservation", async () => {
        const reservationsCol = {
            where: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(snapFromDocs([{}])),
                    }),
                }),
            }),
            doc: jest.fn(() => makeRef("unused")),
        };

        db.collection.mockImplementation((name: string) => {
            if (name === "reservations") return reservationsCol;
            return { where: jest.fn() };
        });

        await expect(
            service.reserveBike({
                email: "test@example.com",
                stationName: "Station A",
                bikeId: "bike123",
            })
        ).rejects.toThrow("User already has an active reservation");
    });

    test("throws error when station does not exist", async () => {
        const reservationsCol = {
            where: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(emptySnap()),
                    }),
                }),
            }),
            doc: jest.fn(() => makeRef("unused")),
        };

        const stationsCol = {
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue(emptySnap()),
                }),
            }),
        };

        db.collection.mockImplementation((name: string) => {
            if (name === "reservations") return reservationsCol;
            if (name === "stations") return stationsCol;
            return { where: jest.fn() };
        });

        await expect(
            service.reserveBike({
                email: "user@example.com",
                stationName: "Missing Station",
                bikeId: "bike123",
            })
        ).rejects.toThrow("Station not found.");
    });

    test("reserves a bike successfully", async () => {
        const stationRef = makeRef("station123");
        const bikeRef = makeRef("bike123");
        const reservationRef = makeRef("newRes123");

        const stationData = {
            name: "Station A",
            status: "occupied",
            numberOfBikes: 3,
            capacity: 10,
            expiresAfterMinutes: 10,
        };
        const stationDoc = makeDocSnapshot(stationData, "station123", stationRef);

        const bikeData = {
            status: "available",
            stationId: "station123",
        };
        const bikeDoc = makeDocSnapshot(bikeData, "bike123", bikeRef);

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
                    get: jest.fn().mockResolvedValue(snapFromDocs([stationDoc])),
                }),
            }),
        };

        const bikesCol = {
            doc: jest.fn((id: string) => {
                if (id === "bike123") return bikeRef;
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
                    if (ref === stationRef) return stationDoc;
                    if (ref === bikeRef) return bikeDoc;
                    return emptySnap();
                }),
                update: jest.fn(),
                set: jest.fn(),
            };
            return transactionFn(tx);
        });

        const result = await service.reserveBike({
            email: "user@example.com",
            stationName: "Station A",
            bikeId: "bike123",
        });

        expect(result.ok).toBe(true);
        expect(result.reservationId).toBe("newRes123");
        expect(result.email).toBe("user@example.com");
        expect(result.bikeId).toBe("bike123");
        expect(result.station.status).toBe("occupied");
    });
});

describe("BikeReservationService.unlockBike", () => {
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

    test("unlocks the bike successfully (not expired)", async () => {
        const email = "test@example.com";
        const bikeId = "bike123";

        const bikeRef = { get: jest.fn() };
        const reservedBike = {
            status: "reserved",
            stationId: "stationA",
        };

        bikeRef.get.mockResolvedValueOnce(makeDocSnapshot(reservedBike, bikeId, bikeRef));

        db.collection.mockReturnValueOnce({
            doc: () => bikeRef,
        });

        const reservationRef = makeRef("res1");
        const reservationSnap = snapFromDocs([
            makeDocSnapshot(
                {
                    email,
                    bikeId,
                    status: "active",
                    reservationExpiry: Timestamp.fromMillis(Date.now() + 10000),
                },
                "res1",
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

        service.freeUpDock = jest.fn().mockResolvedValue(undefined);

        const result = await service.unlockBike({ email, bikeId });

        expect(result).toEqual({
            ok: true,
            message: "Bike unlocked and marked as in use.",
        });

        expect(db.runTransaction).toHaveBeenCalled();

        expect(service.freeUpDock).toHaveBeenCalledWith("stationA");
    });

    test("reservation expired — mark expired + notify + return ok:false", async () => {
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

});

describe("BikeReservationService.returnBike", () => {
    let db: any;
    let service: BikeReservationService;

    beforeEach(() => {
        jest.clearAllMocks();

        db = {
            collection: jest.fn((name) => ({
                name,
                doc: jest.fn((id) => makeRef(id)),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
            })),
            runTransaction: jest.fn(async (fn) => {
                return fn({
                    get: jest.fn(),
                    update: jest.fn(),
                });
            }),
        };

        service = new BikeReservationService(db);
    });

    it("returns a bike successfully", async () => {
        const bikeRef = makeRef("bike123");
        const stationRef = makeRef("stationA");
        const dockRef = makeRef("dock1");

        db.collection.mockImplementation((name: string) => {
            if (name === "bikes") return { doc: () => bikeRef };
            if (name === "stations") return { doc: () => stationRef };
            if (name === "reservations") {
                return {
                    where: jest.fn().mockReturnThis(),
                    orderBy: jest.fn().mockReturnThis(),
                    limit: jest.fn().mockReturnThis(),
                };
            }
            return { doc: jest.fn() };
        });

        db.runTransaction.mockImplementation(async (fn: any) =>
            fn({
                get: jest
                    .fn()
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ status: "on_trip", stationId: null }, "bike123", bikeRef)
                    )
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ name: "Main Station", numberOfBikes: 2, capacity: 10 }, "stationA", stationRef)
                    )
                    .mockResolvedValueOnce(
                        snapFromDocs([makeDocSnapshot({ status: "empty" }, "dock1", dockRef)])
                    )
                    .mockResolvedValueOnce(snapFromDocs([])),
                update: jest.fn(),
            })
        );

        stationRef.get = jest.fn(() =>
            Promise.resolve(
                makeDocSnapshot({ name: "Main Station", numberOfBikes: 3, capacity: 10, status: "occupied" }, "stationA")
            )
        );

        const result = await service.returnBike({
            email: "user@test.com",
            bikeId: "bike123",
            stationId: "stationA",
        });

        expect(result.ok).toBe(true);
    });

    it("throws error if bike not found", async () => {
        const bikeRef = makeRef("bike123");
        const stationRef = makeRef("stationA");

        db.collection.mockImplementation((name: string) => ({
            doc: () => (name === "bikes" ? bikeRef : stationRef),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        }));

        db.runTransaction.mockImplementation(async (fn: any) =>
            fn({
                get: jest.fn().mockResolvedValueOnce({ exists: false }),
            })
        );

        await expect(
            service.returnBike({
                email: "u@test.com",
                bikeId: "bike123",
                stationId: "stationA",
            })
        ).rejects.toThrow("Bike not found.");
    });

    it("throws error when station has no empty docks", async () => {
        const bikeRef = makeRef("bike123");
        const stationRef = makeRef("stationA");

        db.collection.mockImplementation((name: string) => ({
            doc: () => (name === "bikes" ? bikeRef : stationRef),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        }));

        db.runTransaction.mockImplementation(async (fn: any) =>
            fn({
                get: jest
                    .fn()
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ status: "on_trip" }, "bike123", bikeRef)
                    )
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ numberOfBikes: 2, capacity: 10 }, "stationA", stationRef)
                    )
                    .mockResolvedValueOnce(emptySnap())
                    .mockResolvedValueOnce(snapFromDocs([])),
            })
        );

        await expect(
            service.returnBike({
                email: "u@test.com",
                bikeId: "bike123",
                stationId: "stationA",
            })
        ).rejects.toThrow("No available docks at this station.");
    });

    it("completes reservation if active reservation exists", async () => {
        const bikeRef = makeRef("bike123");
        const stationRef = makeRef("stationA");
        const dockRef = makeRef("dock1");
        const resRef = makeRef("res123");

        const txUpdate = jest.fn();

        db.collection.mockImplementation((name: string) => ({
            doc: () => {
                if (name === "bikes") return bikeRef;
                if (name === "stations") return stationRef;
                return makeRef("x");
            },
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        }));

        db.runTransaction.mockImplementation(async (fn: any) =>
            fn({
                get: jest
                    .fn()
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ status: "on_trip" }, "bike123", bikeRef)
                    )
                    .mockResolvedValueOnce(
                        makeDocSnapshot({ numberOfBikes: 2, capacity: 10 }, "stationA", stationRef)
                    )
                    .mockResolvedValueOnce(
                        snapFromDocs([makeDocSnapshot({}, "dock1", dockRef)])
                    )
                    .mockResolvedValueOnce(
                        snapFromDocs([makeDocSnapshot({}, "res123", resRef)])
                    ),
                update: txUpdate,
            })
        );

        stationRef.get = jest.fn(() =>
            Promise.resolve(
                makeDocSnapshot({ status: "occupied", numberOfBikes: 3, capacity: 10 }, "stationA")
            )
        );

        await service.returnBike({
            email: "u@test.com",
            bikeId: "bike123",
            stationId: "stationA",
        });

        expect(txUpdate).toHaveBeenCalledWith(resRef, { status: "completed" });
    });
});