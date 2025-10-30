export type BikeStatus = "available" | "reserved" | "on_trip" | "maintenance";

export class Bike {
  constructor(
    public id: string,
    public status: BikeStatus,
    public isEBike: boolean,
    public stationId: string | null
  ) {}

  canBeReserved(): boolean {
    return this.status === "available";
  }

  markReserved(): void{
    this.status = "reserved";
  }
  setStatus(newStatus: BikeStatus): void {
    this.status = newStatus;
  }

}
