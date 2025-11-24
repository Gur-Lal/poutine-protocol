import { Reservation } from "../../../../src/domain/models/Reservation";

describe("Reservation", () => {
    test("should return true when reservation has expired", () => {
        const pastDate = new Date(Date.now() - 10000);
        const reservation = new Reservation(
            "user@example.com",
            "bike-1",
            new Date(),
            pastDate,
            "active"
        );

        expect(reservation.isExpired()).toBe(true);
    });
});