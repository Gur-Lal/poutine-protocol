import { Bike } from "./Bike";

export type DockStatus = "empty" | "occupied" | "out_of_service";

export class Dock {
  constructor(
    public id: string,
    public status: DockStatus,
    public bike: Bike | null = null
  ) {}

  isOccupied(): boolean {
    return this.status === "occupied" && this.bike !== null;
  }

  isFree(): boolean {
    return this.status === "empty" && this.bike === null;
  }

  occupy(bike: Bike) {
    if(this.status === "out_of_service") throw new Error("Dock out of service.");
    if(!this.isFree()) throw new Error("Dock is not free.");
    this.bike = bike;
    this.status = "occupied";
  }

  vacate(): Bike {
    if(!this.isOccupied()) throw new Error("Dock has no bike to vacate.");
    const removed = this.bike!;
    this.bike = null;
    this.status = "empty";
    return removed;
  }
}