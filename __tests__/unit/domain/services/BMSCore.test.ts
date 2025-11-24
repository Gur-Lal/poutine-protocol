import { BMSCore, Subscriber } from "../../../../src/domain/services/BMSCore";
import { Firestore } from "firebase-admin/firestore";

describe("BMSCore", () => {
    let mockDb: jest.Mocked<Firestore>;
    let mockCollection: any;
    let mockStationsSnapshot: any;
    let core: BMSCore;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(jest.fn());
        jest.spyOn(console, 'debug').mockImplementation(jest.fn());
        jest.spyOn(console, 'info').mockImplementation(jest.fn());
        mockStationsSnapshot = {
            docs: [
                {
                    id: "s1",
                    data: () => ({ name: "Station One", capacity: 10 }),
                },
            ],
        };

        mockCollection = {
            get: jest.fn().mockResolvedValue(mockStationsSnapshot),
            add: jest.fn().mockResolvedValue({}),
            doc: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    id: "s1",
                    data: () => ({ name: "Station One", capacity: 10 }),
                }),
                update: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({}),
            }),
            where: jest.fn().mockReturnThis(),
        };

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        } as any;

        core = new BMSCore(mockDb);
    });

    test("unsubscribe() removes the subscriber", () => {
        const sub: Subscriber = { update: jest.fn() };

        core.subscribe("sub1", sub);
        core.unsubscribe("sub1");

        expect(core.getSubscriberCount()).toBe(0);
    });

    test("publishStations() notifies subscribers", async () => {
        const sub: Subscriber = { update: jest.fn() };

        await core.subscribe("sub1", sub);
        await core.publishStations();

        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "STATIONS_UPDATE",
            })
        );
    });

    test("addStation() writes to DB and publishes update", async () => {
        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        await core.addStation({ id: "x", name: "New Station" } as any);

        expect(mockCollection.add).toHaveBeenCalled();
        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "STATIONS_UPDATE",
            })
        );
    });

    test("updateStation() updates DB and publishes", async () => {
        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        await core.updateStation("s1", { capacity: 20 });

        expect(mockCollection.doc).toHaveBeenCalledWith("s1");
        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "STATIONS_UPDATE",
            })
        );
    });

    test("removeStation() deletes from DB and publishes", async () => {
        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        await core.removeStation("s1");

        expect(mockCollection.doc("s1").delete).toHaveBeenCalled();
        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "STATIONS_UPDATE",
            })
        );
    });

    test("publishBikes() sends a BIKE_UPDATE", async () => {
        const mockBikeSnapshot = {
            docs: [
                { id: "b1", data: () => ({ stationId: "s1", isEBike: false }) },
            ],
        };

        mockCollection.where = jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(mockBikeSnapshot),
        });

        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        await core.publishBikes("s1");

        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "BIKE_UPDATE",
                stationId: "s1",
            })
        );
    });

    test("publishReservation() notifies subscribers", () => {
        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        core.publishReservation("u1", "b1", "RESERVED");

        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "RESERVATION_UPDATE",
                userId: "u1",
                bikeId: "b1",
                action: "RESERVED",
            })
        );
    });

    test("publishSystemUpdate() notifies subscribers", () => {
        const sub: Subscriber = { update: jest.fn() };
        core.subscribe("s1", sub);

        core.publishSystemUpdate("System online");

        expect(sub.update).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "SYSTEM_UPDATE",
                message: "System online",
            })
        );
    });
});
