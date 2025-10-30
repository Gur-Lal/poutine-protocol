import { DockStation } from "./DockStation";
import { Bike } from "./Bike";

export class Trip {
  tripId: string;
  startStation: DockStation;
  endStation: DockStation;
  start: Date;
  end: Date;
  bike: Bike;

  constructor(
    tripId: string,
    startStation: DockStation,
    endStation: DockStation,
    start: Date,
    end: Date,
    bike: Bike
  ) {
    this.tripId = tripId;
    this.startStation = startStation;
    this.endStation = endStation;
    this.start = start;
    this.end = end;
    this.bike = bike;
  }

}

export class TripHistory {
  trips: Trip[];

  constructor(trips: Trip[] = []) {
    this.trips = trips;
  }

  addTrip(trip: Trip): void {
    this.trips.push(trip);
  }

}
