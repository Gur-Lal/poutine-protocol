import { Firestore } from "firebase-admin/firestore";
import { TripData } from "../models/tripData";

export class TripService {
  constructor(private db: Firestore) {}

  async startTrip(email: string, bikeId: string, startStationId: string, startStationName: string): Promise<TripData> {
    const trip: Omit<TripData, "id"> = {
      email,
      bikeId,
      startStationId,
      startStationName,
      startTime: new Date(),
      endTime: null,
      status: "active",
    };

    const ref = await this.db.collection("trips").add(trip);
    return { id: ref.id, ...trip };
  }

  async endTrip(email: string, bikeId: string, endStationId: string, endStationName: string): Promise<TripData> {
    const query = await this.db
      .collection("trips")
      .where("email", "==", email)
      .where("bikeId", "==", bikeId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (query.empty) throw new Error("No active trip found.");

    const doc = query.docs[0];
    const ref = doc.ref;
    const endTime = new Date();

    await ref.update({ endTime, endStationId, endStationName, status: "completed" });

    return {
      id: ref.id,
      ...(doc.data() as TripData),
      endTime,
      endStationId,
      endStationName,
      status: "completed",
    };
  }

  async getUserTrips(email: string): Promise<TripData[]> {
    const snap = await this.db
      .collection("trips")
      .where("email", "==", email)
      .orderBy("startTime", "desc")
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as TripData) }));
  }

  async getAllTrips(): Promise<TripData[]> {
    const snap = await this.db.collection("trips").orderBy("startTime", "desc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as TripData) }));
  }
}