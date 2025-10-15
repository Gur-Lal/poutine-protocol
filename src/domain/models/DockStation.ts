import { Dock } from "./Dock";
import {Bike} from "./Bike";
// to be defined properly
export interface Point {
  latitude: number;
  longitude: number;
}

export type StationStatus = "empty" | "occupied" | "full" | "out_of_service";

export class DockStation {
  constructor(
    public name: string,
    public status: StationStatus,
    public coordinatePosition: Point,
    public address: string,
    public capacity: number,
    public numberOfBikes: number,
    public docks: Dock[],
    public expiresAfterMinutes: number
  ) {
    this.recomputeStatus();
    this.assertInvariants();
  }

  isActive(): boolean {
    return this.status === "out_of_service";
  }

  hasAvailableBike(): boolean {
    return this.status !== "out_of_service" && this.numberOfBikes > 0;
  }

  hasFreeDock(): boolean {
    return this.status !== "out_of_service" && this.numberOfBikes < this.capacity;
  }

  findOccupiedDock(): Dock | null {
    return this.docks.find(d => d.isOccupied?.()) ?? null;
  }

  findFreeDock(): Dock | null{
    return this.docks.find(d => d.isFree()) ?? null;
  }

  commitReservation(): void {
    if(!this.hasAvailableBike()){
      throw new Error("No bikes available at this station.");
    }

    const dock = this.findOccupiedDock();
    if(!dock) throw new Error("No bike found.");
    dock.vacate();
    this.numberOfBikes -=1;
    this.assertInvariants();
    this.recomputeStatus();
  }

  commitReturn(bike: Bike) :void{
    if(!this.hasFreeDock()) throw new Error("No free docks at this station.");
    const dock = this.findFreeDock();
    
    if(!dock) throw new Error("No free dock.");

    dock.occupy(bike);

    this.numberOfBikes += 1;
    this.assertInvariants();
    this.recomputeStatus();
  }

  private recomputeStatus(): void {
    if (this.status === "out_of_service") return;
    if(this.numberOfBikes <= 0) this.status = "empty";
    else if (this.numberOfBikes >= this.capacity) this.status = "full";
    else this.status = "occupied";
  }

  private assertInvariants(): void{
    if(this.capacity < 0) throw new Error("Capacity < 0.");
    if(this.numberOfBikes < 0) throw new Error("numberOfBikes < 0.");
    if(this.numberOfBikes > this.capacity) throw new Error("numberOfBikes > capacity.");
  }

}