export type BikeStatus = "available" | "reserved" | "on_trip" | "maintenance";

export class Bike {
  constructor(
    public id: string,
    public status: BikeStatus,
    public isEBike: boolean
  ) {}

  setStatus(newStatus: BikeStatus): void {
    this.status = newStatus;
  }

}
