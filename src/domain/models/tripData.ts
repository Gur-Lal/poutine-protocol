export interface TripData {
  id?: string;
  email: string;
  bikeId: string;
  startStationId?: string;
  endStationId?: string;
  startTime: Date;
  endTime: Date | null;
  status: "active" | "completed";
}
