export interface TripData {
  id?: string;
  email: string;
  bikeId: string;
  startStationId?: string;
  startStationName: string;
  endStationId?: string;
  endStationName: string;
  startTime: Date;
  endTime: Date | null;
  status: "active" | "completed";
}
