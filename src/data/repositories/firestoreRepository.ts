import { Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/data/firebaseAdmin";

export class FirestoreRepository {
    private db: Firestore;

    constructor() {
        this.db = adminDb;
    }

    async getAllDocuments(collectionName: string): Promise<Record<string, unknown>[]> {
        const snapshot = await this.db.collection(collectionName).get();
        const documents: Record<string, unknown>[] = [];

        snapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });

        return documents;
    }

    async getBikesByStationId(stationId: string) {
        try {
            const bikesSnapshot = await this.db.collection("bikes").where("stationId", "==", stationId).get();

            const bikes = bikesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            return bikes;
        } catch (error) {
            console.error("Error fetching bikes:", error);
        }
    }

    async getReservationByEmail(email: string) {
        try {
            const snapshot = await this.db.collection("reservations")
                .where("email", "==", email)
                .where("status", "==", "active")
                .get();

            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];

            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error("Error fetching reservation:", error);
        }
    }

    async getBikeById(bikeId: string) {
        try {
            const bikeRef = await this.db.collection("bikes").doc(bikeId);
            const bikeSnap = await bikeRef.get();

            if (!bikeSnap.exists) {
                console.log("No such bike found!");
                return null;
            }

            return { id: bikeSnap.id, ...bikeSnap.data() };
        } catch (error) {
            console.error("Error fetching bike:", error);
        }
    }
}