import { Firestore, Transaction, FieldValue, Timestamp, UpdateData, DocumentReference} from "firebase-admin/firestore";

import { Reservation } from "../models/Reservation";
import { Bike, BikeStatus} from "../models/Bike";
import { Dock, DockStatus } from "../models/Dock";
import { DockStation, StationStatus } from "../models/DockStation";

export class BikeReservationService {
    constructor(private db : Firestore) {}
    
    async reserveBike(args: {username: string; stationName: string; bikeId: string;}){
        
        const {username, stationName, bikeId } = args;

        const activeReservationSnap = await this.db
        .collection("reservations")
        .where("username", "==", username)
        .where("status", "==", "active")
        .limit(1)
        .get();

        if (!activeReservationSnap.empty) {
            throw new Error("User already has an active reservation. Please return the previous bike first.");
        }

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

            /** 
            const existingRes = await tx.get(this.db
                .collection("reservations")
                .where("username", "==", username)
                .where("reservationExpiry", ">", Timestamp.now())
                .limit(1)
            );

            if(!existingRes.empty){
                throw new Error("User already has an active reservation.");
            }
            */

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
                status: "active",
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

    async unlockBike({username, bikeId,}: {username: string; bikeId: string;}){
        const bikeRef = this.db.collection("bikes").doc(bikeId);
        const bikeSnap = await bikeRef.get();

        if(!bikeSnap.exists){
            throw new Error("Bike not found.");
        }

        const bike = bikeSnap.data() as Bike;

        if(bike.status !== "reserved"){
            throw new Error("Bike is not reserved.");
        }

        const reservationSnap = await this.db.collection("reservations")
        .where("bikeId", "==", bikeId)
        .where("username", "==", username)
        .where("status", "==", "active")
        .limit(1)
        .get();

        if (reservationSnap.empty) throw new Error("Reservation not found.");

        const reservationDoc = reservationSnap.docs[0];
        const reservation = reservationDoc.data() as Reservation;

        const currentTime = Timestamp.now();
        const reservationExpiry = reservation.reservationExpiry instanceof Timestamp
            ? reservation.reservationExpiry
            : Timestamp.fromDate(reservation.reservationExpiry);

        if(currentTime.toMillis() > reservationExpiry.toMillis()){
            await this.db.runTransaction(async (tx) => {
                tx.update(reservationDoc.ref, {
                    status: "expired",
                });

                tx.update(bikeRef, {
                    status: "available"
                });
            });

            return {
                ok: false,
                message: "Reservation expired, bike is now available.",
            };
        } else {
            await this.db.runTransaction(async (tx) => {

                tx.update(bikeRef, {
                    status: "on_trip" as BikeStatus,
                    stationId: null, 
                });
            });

            if(bike.stationId){
                await this.freeUpDock(bike.stationId);
            }
            return {
                ok:true,
                message: "Bike unlocked and marked as in use.",
            };
        }
    }

private async freeUpDock(stationId: string) {
    const stationRef = this.db.collection("stations").doc(stationId);
    const stationDoc = await stationRef.get();

    if (!stationDoc.exists) throw new Error("Station not found.");
    const station = stationDoc.data() as DockStation;

    const dockSnap = await stationRef.collection("docks").where("status", "==", "occupied").limit(1).get();

    if (!dockSnap.empty) {
        const dockRef = dockSnap.docs[0].ref;

        await dockRef.update({
            status: "empty",
            bikeId: null,
        });

        
        await stationRef.update({
            numberOfBikes: FieldValue.increment(-1),
        });

        }
    }

    async returnBike({
        username,
        bikeId,
        stationId,
    }: {
        username: string;
        bikeId: string;
        stationId: string;
    }) {
        const bikeRef = this.db.collection("bikes").doc(bikeId);
        const bikeSnap = await bikeRef.get();

        if(!bikeSnap.exists){
            throw new Error("Bike not found.");
        }

        const bike = bikeSnap.data() as Bike;

        if(bike.status !== "on_trip"){
            throw new Error("Bike is not currently in use or not on a trip.");
        }

        const stationRef = this.db.collection("stations").doc(stationId);
        const stationDoc = await stationRef.get();

        if(!stationDoc.exists){
            throw new Error("Station not found.");
        }

        const station = stationDoc.data() as DockStation;

        const availableDockSnap = await stationRef.collection("docks")
        .where("status", "==", "empty")
        .limit(1)
        .get();

        if(availableDockSnap.empty){
            throw new Error("No available docks at this station.");
        }

        const dockRef = availableDockSnap.docs[0].ref;

        await this.db.runTransaction(async(tx: Transaction) => {
            tx.update(bikeRef, {
                status: "available" as BikeStatus,
                stationId: stationId,
            });

            tx.update(dockRef, {
                status: "occupied",
                bikeId: bikeId,
            });

            tx.update(stationRef, {
                numberOfBikes: FieldValue.increment(1),
            });

            const newStatus = station.numberOfBikes + 1 >= station.capacity ? "full" : "occupied";
            tx.update(stationRef, {
                status: newStatus,
            });

            const reservationSnap = await this.db.collection("reservations")
            .where("bikeId", "==", bikeId)
            .where("username", "==", username)
            .limit(1)
            .get();

            if(!reservationSnap.empty){
                const reservationDoc = reservationSnap.docs[0];
                tx.update(reservationDoc.ref, {
                    status: "completed",
                });
            }
        });

        return {
            ok: true, 
            message: "Bike returned successfully, and dock status updated.",
        };
    }
}