import { AdminService, } from "../../../../src/domain/services/adminService";
import { Firestore } from "firebase-admin/firestore";

describe("AdminService.moveBike", () => {
    let mockDb: jest.Mocked<Firestore>;
    let service: AdminService;

    let transaction: any;

    beforeEach(() => {
        jest.clearAllMocks();

        transaction = {
            get: jest.fn(),
            update: jest.fn(),
        };

        mockDb = {
            collection: jest.fn().mockImplementation((collectionPath: string) => ({
                doc: jest.fn().mockImplementation((id: string) => ({
                    id,
                    get: jest.fn(),
                    collection: jest.fn().mockImplementation((subPath: string) => ({
                        where: jest.fn().mockImplementation(() => ({
                            limit: jest.fn().mockImplementation(() => ({
                                get: jest.fn(),
                            })),
                        })),
                    })),
                })),
            })),
            runTransaction: jest.fn((fn) => fn(transaction)),
        } as any;


        service = new AdminService(mockDb);
    });

    function mockDoc(data: any) {
        return { exists: true, data: () => data };
    }

    it("throws if source station has no bikes", async () => {
        const sourceStation = {
            status: "occupied",
            capacity: 10,
            numberOfBikes: 0,
        };
        const destStation = {
            status: "occupied",
            capacity: 10,
            numberOfBikes: 5,
        };
        const bike = { status: "available", stationId: "source" };

        transaction.get
            .mockResolvedValueOnce(mockDoc(sourceStation))
            .mockResolvedValueOnce(mockDoc(destStation))
            .mockResolvedValueOnce(mockDoc(bike));

        await expect(
            service.moveBike({
                bikeId: "bike1",
                sourceStationId: "source",
                destinationStationId: "dest",
            })
        ).rejects.toThrow("Source station has no bikes");
    });

    it("throws if bike is not at source station", async () => {
        const sourceStation = {
            status: "occupied",
            capacity: 10,
            numberOfBikes: 3,
        };
        const destStation = {
            status: "occupied",
            capacity: 10,
            numberOfBikes: 2,
        };
        const bike = { status: "available", stationId: "otherStation" };

        transaction.get
            .mockResolvedValueOnce(mockDoc(sourceStation))
            .mockResolvedValueOnce(mockDoc(destStation))
            .mockResolvedValueOnce(mockDoc(bike));

        await expect(
            service.moveBike({
                bikeId: "bike1",
                sourceStationId: "sourceX",
                destinationStationId: "destX",
            })
        ).rejects.toThrow("Bike is not at the source station");
    });
});
