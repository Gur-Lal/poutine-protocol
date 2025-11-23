import { Timestamp } from "firebase-admin/firestore";
import { BillingService } from "../../../../src/domain/services/billingService";
import { Billing, BillingStatus } from "../../../../src/domain/models/Billing";

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

const mockFirestore = {
    collection: mockCollection,
} as any;

describe("BillingService", () => {
    let billingService: BillingService;

    beforeEach(() => {
        jest.clearAllMocks();
        billingService = new BillingService(mockFirestore);
    });

    describe("createBilling", () => {
        it("should create a new billing record", async () => {
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
                email: "test@example.com",
                tripId: "trip123",
                amount: 100,
                description: "Test billing",
                date: testDate,
                status: "pending" as BillingStatus,
                stripeSessionId: "session123",
                stripePaymentIntentId: "pi123",
            };

            const result = await billingService.createBilling(billingData);

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

            expect(result).toBeInstanceOf(Billing);
            expect(result.id).toBe(mockDocId);
            expect(result.email).toBe(billingData.email);
        });

        it("should handle optional stripe fields", async () => {
            const mockDocId = "billing456";

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
                email: "test@example.com",
                tripId: "trip123",
                amount: 50,
                description: "Test billing without stripe",
                date: new Date(),
                status: "pending" as BillingStatus,
            };

            await billingService.createBilling(billingData);

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    stripeSessionId: null,
                    stripePaymentIntentId: null,
                })
            );
        });
    });

    describe("getBillingsByEmail", () => {
        it("should return billings sorted by date descending", async () => {
            const date1 = new Date("2024-01-10");
            const date2 = new Date("2024-01-15");
            const date3 = new Date("2024-01-20");

            const mockDocs = [
                {
                    id: "billing1",
                    data: () => ({
                        userId: "user123",
                        email: "test@example.com",
                        tripId: "trip1",
                        amount: 100,
                        description: "First",
                        date: { toDate: () => date1 },
                        status: "paid" as BillingStatus,
                        stripeSessionId: null,
                        stripePaymentIntentId: null,
                    }),
                },
                {
                    id: "billing2",
                    data: () => ({
                        userId: "user123",
                        email: "test@example.com",
                        tripId: "trip2",
                        amount: 200,
                        description: "Second",
                        date: { toDate: () => date3 },
                        status: "pending",
                        stripeSessionId: null,
                        stripePaymentIntentId: null,
                    }),
                },
                {
                    id: "billing3",
                    data: () => ({
                        userId: "user123",
                        email: "test@example.com",
                        tripId: "trip3",
                        amount: 150,
                        description: "Third",
                        date: { toDate: () => date2 },
                        status: "paid" as BillingStatus,
                        stripeSessionId: null,
                        stripePaymentIntentId: null,
                    }),
                },
            ];

            mockCollection.mockReturnValue({
                where: mockWhere,
            });

            mockWhere.mockReturnValue({
                get: mockGet,
            });

            mockGet.mockResolvedValue({
                empty: false,
                docs: mockDocs,
            });

            const result = await billingService.getBillingsByEmail("test@example.com");

            expect(mockCollection).toHaveBeenCalledWith("billings");
            expect(mockWhere).toHaveBeenCalledWith("email", "==", "test@example.com");
            expect(result).toHaveLength(3);
            expect(result[0].id).toBe("billing2"); // Most recent
            expect(result[1].id).toBe("billing3");
            expect(result[2].id).toBe("billing1"); // Oldest
        });

        it("should return empty array when no billings found", async () => {
            mockCollection.mockReturnValue({
                where: mockWhere,
            });

            mockWhere.mockReturnValue({
                get: mockGet,
            });

            mockGet.mockResolvedValue({
                empty: true,
                docs: [],
            });

            const result = await billingService.getBillingsByEmail("nonexistent@example.com");

            expect(result).toEqual([]);
        });
    });

    describe("getBillingById", () => {
        it("should return a billing when found", async () => {
            const testDate = new Date("2024-01-15");

            mockCollection.mockReturnValue({
                doc: mockDoc,
            });

            mockDoc.mockReturnValue({
                get: mockGet,
            });

            mockGet.mockResolvedValue({
                exists: true,
                id: "billing123",
                data: () => ({
                    userId: "user123",
                    email: "test@example.com",
                    tripId: "trip123",
                    amount: 100,
                    description: "Test billing",
                    date: { toDate: () => testDate },
                    status: "paid" as BillingStatus,
                    stripeSessionId: "session123",
                    stripePaymentIntentId: "pi123",
                }),
            });

            const result = await billingService.getBillingById("billing123");

            expect(mockCollection).toHaveBeenCalledWith("billings");
            expect(mockDoc).toHaveBeenCalledWith("billing123");
            expect(result).toBeInstanceOf(Billing);
            expect(result?.id).toBe("billing123");
            expect(result?.email).toBe("test@example.com");
        });
    });

    describe("updateBillingStatus", () => {
        it("should update billing status", async () => {
            mockCollection.mockReturnValue({
                doc: mockDoc,
            });

            mockDoc.mockReturnValue({
                update: mockUpdate,
            });

            mockUpdate.mockResolvedValue(undefined);

            await billingService.updateBillingStatus("billing123", "paid" as BillingStatus);

            expect(mockCollection).toHaveBeenCalledWith("billings");
            expect(mockDoc).toHaveBeenCalledWith("billing123");
            expect(mockUpdate).toHaveBeenCalledWith({
                status: "paid" as BillingStatus,
            });
        });
    });

    describe("getBillingByTripId", () => {
        it("should return billing when found", async () => {
            const testDate = new Date("2024-01-15");

            const mockDocData = {
                id: "billing123",
                data: () => ({
                    userId: "user123",
                    email: "test@example.com",
                    tripId: "trip123",
                    amount: 100,
                    description: "Test billing",
                    date: { toDate: () => testDate },
                    status: "pending",
                    stripeSessionId: "session123",
                    stripePaymentIntentId: "pi123",
                }),
            };

            mockCollection.mockReturnValue({
                where: mockWhere,
            });

            mockWhere.mockReturnValue({
                limit: mockLimit,
            });

            mockLimit.mockReturnValue({
                get: mockGet,
            });

            mockGet.mockResolvedValue({
                empty: false,
                docs: [mockDocData],
            });

            const result = await billingService.getBillingByTripId("trip123");

            expect(mockCollection).toHaveBeenCalledWith("billings");
            expect(mockWhere).toHaveBeenCalledWith("tripId", "==", "trip123");
            expect(mockLimit).toHaveBeenCalledWith(1);
            expect(result).toBeInstanceOf(Billing);
            expect(result?.tripId).toBe("trip123");
        });
    });
});