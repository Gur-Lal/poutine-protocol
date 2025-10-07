import { Dock } from "./Dock";

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
  ) {}

}