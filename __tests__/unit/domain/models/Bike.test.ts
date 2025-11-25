import { Bike } from "../../../../src/domain/models/Bike";

describe("Bike", () => {
    test("canBeReserved returns true when status is available", () => {
        const bike = new Bike("bike-1", "available", false, "station-1");
        expect(bike.canBeReserved()).toBe(true);
    });

    test("canBeReserved returns false when status is not available", () => {
        const bike = new Bike("bike-2", "on_trip", true, null);
        expect(bike.canBeReserved()).toBe(false);
    });

    test("markReserved changes status to reserved", () => {
        const bike = new Bike("bike-3", "available", false, "station-2");
        bike.markReserved();
        expect(bike.status).toBe("reserved");
    });

    test("setStatus updates the bike status", () => {
        const bike = new Bike("bike-4", "available", true, "station-3");
        bike.setStatus("maintenance");
        expect(bike.status).toBe("maintenance");
    });
});