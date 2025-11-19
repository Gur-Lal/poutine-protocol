import { Trip, TripHistory } from "../../../src/domain/models/Trip";
import { DockStation } from "../../../src/domain/models/DockStation";
import { Bike } from "../../../src/domain/models/Bike";
import { Dock } from "../../../src/domain/models/Dock";

describe("TripHistory", () => {
    const mockPoint = { latitude: 40.7128, longitude: -74.006 };
    const mockDocks = [
        new Dock("1", "occupied", new Bike("bike-1", "available", true, "1")),
        new Dock("2", "occupied", new Bike("bike-2", "available", false, "1")),
        new Dock("3", "empty")];

    test("should initialize with empty trips array", () => {
        const history = new TripHistory();

        expect(history.trips).toEqual([]);
        expect(history.trips.length).toBe(0);
    });

    test("should add a trip to the history", () => {
        const history = new TripHistory();
        const startStation = new DockStation("s1", "Start Station", "occupied", mockPoint, "789 Elm St", 3, 2, mockDocks, 20);
        const endStation = new DockStation("s2", "End Station", "occupied", mockPoint, "789 Elm St", 3, 2, mockDocks, 20);
        const bike = new Bike("bike-1", "available", true, "1");
        const trip = new Trip(
            "trip-1",
            startStation,
            "Main St",
            endStation,
            "Park Ave",
            new Date(),
            new Date(),
            bike
        );

        history.addTrip(trip);

        expect(history.trips.length).toBe(1);
        expect(history.trips[0]).toBe(trip);
    });
});