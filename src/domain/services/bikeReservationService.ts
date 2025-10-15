import { Firestore, Transaction, FieldValue, Timestamp, UpdateData, DocumentReference} from "firebase-admin/firestore";

import { Reservation } from "../models/Reservation";
import { Bike, BikeStatus} from "../models/Bike";
import { Dock, DockStatus } from "../models/Dock";
import { DockStation, StationStatus } from "../models/DockStation";

export class BikeReservationService {
    constructor(private db : Firestore) {}
    
    async reserveBike(args: {username: string; stationName: string; bikeId: string;}){
        
        const {username, stationName, bikeId } = args;

        const stationSnap = await this.db
        .collection("stations")
        .where("name", "==", stationName)
        .limit(1)
        .get();

        if(stationSnap.empty){
            throw new Error("Station not found.");
        }

        const stationRef = stationSnap.docs[0].ref;

        const result = await this.db.runTransaction(async (tx: Transaction) => {
            const stationDoc = await tx.get(stationRef);

            if(!stationDoc.exists) throw new Error("Station not found");

            const station = stationDoc.data() as unknown as DockStation;
            if(station.status === "out_of_service"){
                throw new Error("Station is out of service");
            }
            if(station.numberOfBikes <= 0){
                throw new Error("No bikes available at this station.");
            }

            const existingRes = await tx.get(this.db
                .collection("reservations")
                .where("username", "==", username)
                .where("reservationExpiry", ">", Timestamp.now())
                .limit(1)
            );

            if(!existingRes.empty){
                throw new Error("User already has an active reservation.");
            }

            const bikeRef = this.db.collection("bikes").doc(bikeId);
            const bikeDoc = await tx.get(bikeRef);
            if(!bikeDoc.exists) throw new Error("Bike not found.");

            const bike = bikeDoc.data() as unknown as Bike & {stationId?: string | null};

            if(bike.status !== "available"){
                throw new Error("Bike is not available");
            }

            if(bike.stationId !== stationRef.id){
                throw new Error("Bike is not at the specified station.");
            }

            const docksCol = stationRef.collection("docks");
            const dockWithThisBike = await tx.get(
                docksCol.where("bikeId", "==", bikeId).limit(1)
            );

            let dockRefToVacate: DocumentReference | null = null;

            if(!dockWithThisBike.empty){
                dockRefToVacate = dockWithThisBike.docs[0].ref;
            } else {
                const anyOcc = await tx.get(
                    docksCol.where("status", "==", "occupied").limit(1)
                );

                if(anyOcc.empty){
                    throw new Error("No occupied dock found to vacate.");
                }
                dockRefToVacate = anyOcc.docs[0].ref;
            }

            if(!dockRefToVacate){
                throw new Error("No occupied dock found to vacate");
            }

            tx.update(dockRefToVacate, {
                status: "empty",
                bikeId: null,
            } as UpdateData<Dock>);

            tx.update(stationRef, {
                numberOfBikes: FieldValue.increment(-1),
            } as UpdateData<DockStation>);

            tx.update(bikeRef, {
                status: "reserved",
            } as UpdateData<Bike>);

            const startTs = Timestamp.now();
            const expiryMs = (station.expiresAfterMinutes ?? 10) * 60 * 1000;
            const expiryTs = Timestamp.fromMillis(startTs.toMillis() + expiryMs);

            const reservation = new Reservation(username, bikeId, startTs.toDate(), expiryTs.toDate());

            const reservationRef = this.db.collection("reservations").doc();
            tx.set(reservationRef, {
                username: reservation.username,
                bikeId: reservation.bikeId,
                startTime: startTs,
                reservationExpiry: expiryTs,
            });

            const newNumberOfBikes = (station.numberOfBikes ?? 0) - 1;
            const newStatus: StationStatus = newNumberOfBikes <= 0 ? "empty": newNumberOfBikes >= (station.capacity ?? Number.MAX_SAFE_INTEGER) ? "full": "occupied";

            return {
                reservationId: reservationRef.id, reservation,
                stationSnapshot: {
                    id: stationRef.id,
                    name: (station as any).name,
                    capacity: station.capacity,
                    numberOfBikes: newNumberOfBikes,
                    status: newStatus,
                },
                bikeSnapshot: {
                    id:bikeRef.id,
                    status: "reserved" as BikeStatus,
                },
            };
        });

        return {
            ok: true,
            reservationId: result.reservationId,
            username,
            bikeId,
            startTime: result.reservation.startTime.toISOString(),
            reservationExpiry: result.reservation.reservationExpiry.toISOString(),
            station: result.stationSnapshot,
            bike: result.bikeSnapshot,
        };
    }
}