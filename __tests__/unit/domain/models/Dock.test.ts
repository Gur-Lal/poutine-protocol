import { Bike } from "../../../../src/domain/models/Bike";
import { Dock } from "../../../../src/domain/models/Dock";

describe("Dock", () => {
    test("should occupy a free dock with a bike", () => {
        const dock = new Dock("dock-1", "empty");
        const bike = new Bike("bike-1", "available", true, "1");

        dock.occupy(bike);

        expect(dock.isOccupied()).toBe(true);
        expect(dock.bike).toBe(bike);
        expect(dock.status).toBe("occupied");
    });

    test("should vacate an occupied dock and return the bike", () => {
        const bike = new Bike("bike-1", "available", true, "1");
        const dock = new Dock("dock-1", "occupied", bike);

        const removedBike = dock.vacate();

        expect(removedBike).toBe(bike);
        expect(dock.isFree()).toBe(true);
        expect(dock.bike).toBeNull();
    });

    test("should throw error when occupying a dock that is not free", () => {
        const bike1 = new Bike("bike-1", "available", true, "1");
        const bike2 = new Bike("bike-2", "available", true, "1");
        const dock = new Dock("1", "occupied", bike1);

        expect(() => dock.occupy(bike2)).toThrow("Dock is not free.");
    });

    test("should throw error when vacating a dock with no bike", () => {
        const dock = new Dock("dock-1", "empty");

        expect(() => dock.vacate()).toThrow("Dock has no bike to vacate.");
    });
});