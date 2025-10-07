import { Bike } from "./Bike";

export type DockStatus = "empty" | "occupied" | "out_of_service";

export class Dock {
  constructor(
    public id: string,
    public status: DockStatus,
    public bike: Bike | null = null
  ) {}

}