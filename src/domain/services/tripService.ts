import { Firestore } from "firebase-admin/firestore";
import { TripData } from "../models/TripData";

export class TripService {
  constructor(private db: Firestore) { }

  async startTrip(email: string, bikeId: string, startStationId: string, startStationName: string, isEBike: boolean): Promise<TripData> {
    const trip: Omit<TripData, "id"> = {
      email,
      bikeId,
      startStationId,
      startStationName,
      startTime: new Date(),
      endTime: null,
      endStationName: "",
      status: "active",
      isEBike: isEBike
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
      ...(doc.data() as TripData),
      id: ref.id,
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
      .where("status", "==", "completed")
      .orderBy("startTime", "desc")
      .get();

    return snap.docs.map((doc) => ({ ...(doc.data() as TripData), id: doc.id }));
  }

  async getActiveTrip(email: string): Promise<TripData | null> {
    const snap = await this.db
      .collection("trips")
      .where("email", "==", email)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snap.empty) {
      return null;
    }

    return { ...(snap.docs[0].data() as TripData), id: snap.docs[0].id };
  }

  async getAllTrips(): Promise<TripData[]> {
    const snap = await this.db.collection("trips").orderBy("startTime", "desc").get();
    return snap.docs.map((doc) => ({ ...(doc.data() as TripData), id: doc.id }));
  }
}