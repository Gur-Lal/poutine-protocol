import { TripService } from "../../../src/domain/services/tripService";
import { Firestore } from "firebase-admin/firestore";

jest.mock("firebase-admin/firestore");

function mockDoc(id: string, data: any = {}) {
    return {
        id,
        data: () => data,
        ref: {
            id,
            update: jest.fn().mockResolvedValue(undefined),
        },
    };
}

describe("TripService", () => {
    let service: TripService;
    let mockDb: jest.Mocked<Firestore>;

    beforeEach(() => {
        mockDb = {
            collection: jest.fn()
        } as any;

        service = new TripService(mockDb);
    });

    it("startTrip should create and return a new trip", async () => {
        const mockAdd = jest.fn().mockResolvedValue({ id: "trip123" });

        mockDb.collection.mockReturnValue({
            add: mockAdd,
        } as any);

        const result = await service.startTrip(
            "user@example.com",
            "bike1",
            "stationA",
            "Station A",
            true
        );

        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "user@example.com",
                bikeId: "bike1",
                startStationId: "stationA",
                startStationName: "Station A",
                status: "active",
                isEBike: true,
            })
        );

        expect(result.id).toBe("trip123");
    });

    it("endTrip should update active trip and return completed trip", async () => {
        const activeTripData = {
            email: "user@example.com",
            bikeId: "bike1",
            status: "active",
            startStationName: "Station A",
            startStationId: "stationA",
            startTime: new Date(),
            endTime: null,
            endStationName: "",
        };

        const mockDocObj = mockDoc("trip1", activeTripData);

        const mockQuery = {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDocObj],
            }),
        };

        mockDb.collection.mockReturnValue(mockQuery as any);

        const result = await service.endTrip("user@example.com", "bike1", "stationB", "Station B");

        expect(mockDocObj.ref.update).toHaveBeenCalledWith(
            expect.objectContaining({
                endStationId: "stationB",
                endStationName: "Station B",
                status: "completed",
            })
        );

        expect(result.status).toBe("completed");
        expect(result.endStationName).toBe("Station B");
        expect(result.id).toBe("trip1");
    });

    it("getUserTrips should return completed trips sorted by startTime", async () => {
        mockDb.collection.mockReturnValue({
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: [
                    mockDoc("1", { email: "user@example.com", status: "completed" }),
                    mockDoc("2", { email: "user@example.com", status: "completed" }),
                ],
            }),
        } as any);

        const result = await service.getUserTrips("user@example.com");

        expect(result.length).toBe(2);
        expect(result[0].id).toBe("1");
    });

    it("getActiveTrip should return null when no active trip", async () => {
        mockDb.collection.mockReturnValue({
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }),
        } as any);

        const result = await service.getActiveTrip("user@example.com");
        expect(result).toBeNull();
    });

    it("getActiveTrip should return active trip", async () => {
        mockDb.collection.mockReturnValue({
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDoc("trip99", { email: "user@example.com", status: "active" })],
            }),
        } as any);

        const result = await service.getActiveTrip("user@example.com");
        expect(result?.id).toBe("trip99");
    });

    it("getAllTrips should return all trips", async () => {
        mockDb.collection.mockReturnValue({
            orderBy: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: [
                    mockDoc("a", { status: "completed" }),
                    mockDoc("b", { status: "active" }),
                ],
            }),
        } as any);

        const result = await service.getAllTrips();
        expect(result.length).toBe(2);
        expect(result[0].id).toBe("a");
    });
});
