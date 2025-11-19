import { Billing } from "../../../src/domain/models/Billing";

describe("Billing", () => {
    test("should return true when billing status is paid", () => {
        const billing = new Billing({
            id: "bill-1",
            userId: "user-1",
            email: "user@example.com",
            tripId: "trip-1",
            amount: 10.5,
            description: "Bike rental",
            date: new Date(),
            status: "paid"
        });

        expect(billing.isPaid()).toBe(true);
    });

    test("should mark billing as paid", () => {
        const billing = new Billing({
            id: "bill-1",
            userId: "user-1",
            email: "user@example.com",
            tripId: "trip-1",
            amount: 10.5,
            description: "Bike rental",
            date: new Date(),
            status: "pending"
        });

        billing.markAsPaid();

        expect(billing.status).toBe("paid");
        expect(billing.isPaid()).toBe(true);
    });

    test("should mark billing as failed", () => {
        const billing = new Billing({
            id: "bill-1",
            userId: "user-1",
            email: "user@example.com",
            tripId: "trip-1",
            amount: 10.5,
            description: "Bike rental",
            date: new Date(),
            status: "pending"
        });

        billing.markAsFailed();

        expect(billing.status).toBe("failed");
        expect(billing.isPaid()).toBe(false);
    });
});