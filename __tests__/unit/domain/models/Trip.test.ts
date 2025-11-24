import { Trip } from "../../../../src/domain/models/Trip";
import { DockStation } from "../../../../src/domain/models/DockStation";
import { Bike } from "../../../../src/domain/models/Bike";
import { Dock } from "../../../../src/domain/models/Dock";

describe("Trip", () => {
    const mockPoint = { latitude: 40.7128, longitude: -74.006 };
    const mockDocks = [
        new Dock("1", "occupied", new Bike("bike-1", "available", true, "1")),
        new Dock("2", "occupied", new Bike("bike-2", "available", false, "1")),
        new Dock("3", "empty")];
    test("should create a trip with all properties", () => {
        const startStation = new DockStation("s1", "Start Station", "occupied", mockPoint, "789 Elm St", 3, 2, mockDocks, 20);
        const endStation = new DockStation("s2", "End Station", "occupied", mockPoint, "789 Elm St", 3, 2, mockDocks, 20);
        const bike = new Bike("bike-1", "available", true, "1")
        const startDate = new Date("2024-01-01T10:00:00");
        const endDate = new Date("2024-01-01T10:30:00");

        const trip = new Trip(
            "trip-1",
            startStation,
            "Main St",
            endStation,
            "Park Ave",
            startDate,
            endDate,
            bike
        );

        expect(trip.tripId).toBe("trip-1");
        expect(trip.startStation).toBe(startStation);
        expect(trip.startStationName).toBe("Main St");
        expect(trip.endStation).toBe(endStation);
        expect(trip.endStationName).toBe("Park Ave");
        expect(trip.start).toBe(startDate);
        expect(trip.end).toBe(endDate);
        expect(trip.bike).toBe(bike);
    });
});