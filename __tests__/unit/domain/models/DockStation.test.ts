import { DockStation, Point } from "../../../../src/domain/models/DockStation";
import { Bike } from "../../../../src/domain/models/Bike";
import { Dock } from "../../../../src/domain/models/Dock";

describe("DockStation", () => {
    let mockDocks: Dock[];
    let mockPoint: Point;

    beforeEach(() => {
        mockPoint = { latitude: 40.7128, longitude: -74.006 };
        mockDocks = [
            new Dock("1", "occupied", new Bike("bike-1", "available", true, "1")), 
            new Dock("2", "occupied", new Bike("bike-2", "available", false, "1")), 
            new Dock("3", "empty")];
    });

    test("should initialize with correct status based on bike count", () => {
        const emptyStation = new DockStation(
            "1", "Empty Station", "empty", mockPoint, "123 Main St", 3, 0, mockDocks, 20);
        expect(emptyStation.status).toBe("empty");

        const fullStation = new DockStation(
            "2", "Full Station", "full", mockPoint, "456 Oak Ave", 3, 3, mockDocks, 20
        );
        expect(fullStation.status).toBe("full");

        const occupiedStation = new DockStation(
            "3", "Occupied Station", "occupied", mockPoint, "789 Elm St", 3, 2, mockDocks, 20
        );
        expect(occupiedStation.status).toBe("occupied");
    });

    test("should successfully commit a reservation when bikes are available", () => {
        const station = new DockStation(
            "1", "Test Station", "occupied", mockPoint, "123 Main St", 3, 2, mockDocks, 20
        );

        expect(station.numberOfBikes).toBe(2);
        station.commitReservation();

        expect(station.numberOfBikes).toBe(1);
        expect(station.status).toBe("occupied");
    });

    test("should throw error when committing reservation with no bikes available", () => {
        const emptyDocks = [new Dock("1", "empty")];

        const station = new DockStation("1", "Empty Station", "empty", mockPoint, "123 Main St", 1, 0, emptyDocks, 20);

        expect(() => station.commitReservation()).toThrow("No bikes available at this station.");
    });

    test("should successfully commit a bike return when there is a dock available", () => {
        const station = new DockStation("1", "Test Station", "occupied", mockPoint, "123 Main St", 3, 2, mockDocks, 20);
        const mockBike = new Bike("bike-3", "on_trip", false, null);

        expect(station.numberOfBikes).toBe(2);
        station.commitReturn(mockBike);

        expect(station.numberOfBikes).toBe(3);
        expect(station.status).toBe("full");
    });

    test("should throw error when committing return with no free docks", () => {
        const fullDocks = [new Dock("3", "occupied", new Bike("bike-1", "available", false, "2"))];

        const station = new DockStation("1", "Full Station", "full", mockPoint, "123 Main St", 1, 1, fullDocks, 20);
        const mockBike = new Bike("bike-3", "on_trip", false, null);

        expect(() => station.commitReturn(mockBike)).toThrow("No free docks at this station.");
    });
})