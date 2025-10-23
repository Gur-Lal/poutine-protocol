export interface TripData {
  id?: string;
  username: string;
  bikeId: string;
  startStationId?: string;
  endStationId?: string;
  startTime: Date;
  endTime: Date | null;
  status: "active" | "completed";
}
