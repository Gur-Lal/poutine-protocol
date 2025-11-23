import { Firestore, Transaction, Timestamp, UpdateData } from "firebase-admin/firestore";
import { Reservation } from "../models/Reservation";
import { Bike, BikeStatus } from "../models/Bike";
import { DockStation, StationStatus } from "../models/DockStation";
import { createServerNotification } from "@/domain/services/serverNotificationService";
import { createAdminNotification } from "@/domain/services/adminService";
import { UserData } from "../models/UserData";
import { getTierPerks } from "./tierService";

export class BikeReservationService {
    constructor(private db: Firestore) { }

    async reserveBike(args: { email: string; stationName: string; bikeId: string; }) {

        const { email, stationName, bikeId } = args;

        const activeReservationSnap = await this.db
            .collection("reservations")
            .where("email", "==", email)
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

        if (stationSnap.empty) {
            throw new Error("Station not found.");
        }

        const stationRef = stationSnap.docs[0].ref;

        const userSnap = await this.db
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();

        if (userSnap.empty) throw new Error("User not found.");
        const userRef = userSnap.docs[0].ref;

        const result = await this.db.runTransaction(async (tx: Transaction) => {
            const stationDoc = await tx.get(stationRef);
            const userDoc = await tx.get(userRef);
            if (!stationDoc.exists) throw new Error("Station not found");
            if(!userDoc.exists) throw new Error("User not found");

            const station = stationDoc.data() as DockStation;
            const user = userDoc.data() as UserData;
            
            if (station.status === "out_of_service") {
                throw new Error("Station is out of service");
            }
            if (station.numberOfBikes <= 0) {
                throw new Error("No bikes available at this station.");
            }

            const bikeRef = this.db.collection("bikes").doc(bikeId);
            const bikeDoc = await tx.get(bikeRef);
            if (!bikeDoc.exists) throw new Error("Bike not found.");

            const bike = bikeDoc.data() as unknown as Bike & { stationId?: string | null };

            if (bike.status !== "available") {
                throw new Error("Bike is not available");
            }

            if (bike.stationId !== stationRef.id) {
                throw new Error("Bike is not at the specified station.");
            }

            tx.update(bikeRef, {
                status: "reserved",
            } as UpdateData<Bike>);

            const startTs = Timestamp.now();
            const baseMinutes = station.expiresAfterMinutes ?? 10;
            const perks = getTierPerks(user.tier);
            const extraMinutes = perks.extraReservationMinutes;
            const totalMinutes = baseMinutes + extraMinutes;
        
            const expiryTs = Timestamp.fromMillis(startTs.toMillis() + totalMinutes * 60 * 1000);

            const reservation = new Reservation(email, bikeId, startTs.toDate(), expiryTs.toDate(), "active");

            const reservationRef = this.db.collection("reservations").doc();
            tx.set(reservationRef, {
                email: reservation.email,
                bikeId: reservation.bikeId,
                startTime: startTs,
                reservationExpiry: expiryTs,
                status: "active",
            });

            const newNumberOfBikes = (station.numberOfBikes ?? 0) - 1;
            const newStatus: StationStatus = newNumberOfBikes <= 0 ? "empty" : newNumberOfBikes >= (station.capacity ?? Number.MAX_SAFE_INTEGER) ? "full" : "occupied";

            return {
                reservationId: reservationRef.id, reservation,
                stationSnapshot: {
                    id: stationRef.id,
                    name: station.name,
                    capacity: station.capacity,
                    numberOfBikes: newNumberOfBikes,
                    status: newStatus,
                },
                bikeSnapshot: {
                    id: bikeRef.id,
                    status: "reserved" as BikeStatus,
                },
            };
        });

        // Check if station became empty after reservation
        if (result.stationSnapshot.status === "empty") {
            await createAdminNotification(
                this.db,
                "Station Empty",
                `${result.stationSnapshot.name} is now empty after reservation`
            );
        }

        return {
            ok: true,
            reservationId: result.reservationId,
            email,
            bikeId,
            startTime: result.reservation.startTime.toISOString(),
            reservationExpiry: result.reservation.reservationExpiry.toISOString(),
            station: result.stationSnapshot,
            bike: result.bikeSnapshot,
        };
    }

    async unlockBike({ email, bikeId, }: { email: string; bikeId: string; }) {
        const bikeRef = this.db.collection("bikes").doc(bikeId);
        const bikeSnap = await bikeRef.get();

        if (!bikeSnap.exists) {
            throw new Error("Bike not found.");
        }

        const bike = bikeSnap.data() as Bike;

        if (bike.status !== "reserved") {
            throw new Error("Bike is not reserved.");
        }

        const reservationSnap = await this.db.collection("reservations")
            .where("bikeId", "==", bikeId)
            .where("email", "==", email)
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

        if (currentTime.toMillis() > reservationExpiry.toMillis()) {
            await this.db.runTransaction(async (tx) => {
                tx.update(reservationDoc.ref, {
                    status: "expired",
                });

                tx.update(bikeRef, {
                    status: "available"
                });
            });
            await createServerNotification(email, "Reservation expired", "The bike you had reserved is now available.");
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

            if (bike.stationId) {
                await this.freeUpDock(bike.stationId);
            }
            return {
                ok: true,
                message: "Bike unlocked and marked as in use.",
            };
        }
    }

    private async freeUpDock(stationId: string) {
        const stationRef = this.db.collection("stations").doc(stationId);
        await this.db.runTransaction(async (tx) => {
            const stationDoc = await tx.get(stationRef);

            if (!stationDoc.exists) throw new Error("Station not found.");
            const station = stationDoc.data() as DockStation;

            const dockSnap = await stationRef.collection("docks")
                .where("status", "==", "occupied")
                .limit(1)
                .get();

            if (!dockSnap.empty) {
                const dockRef = dockSnap.docs[0].ref;

                tx.update(dockRef, {
                    status: "empty",
                    bikeId: null,
                });

                const newNumberOfBikes = (station.numberOfBikes ?? 1) - 1;

                let newStatus: StationStatus;
                if (newNumberOfBikes <= 0) {
                    newStatus = "empty";
                } else if (newNumberOfBikes >= (station.capacity ?? Number.MAX_SAFE_INTEGER)) {
                    newStatus = "full";
                } else {
                    newStatus = "occupied";
                }

                tx.update(stationRef, {
                    numberOfBikes: newNumberOfBikes,
                    status: newStatus,
                });
            }
        });
    }

    async returnBike({
        email,
        bikeId,
        stationId,
    }: {
        email: string;
        bikeId: string;
        stationId: string;
    }) {
        const bikeRef = this.db.collection("bikes").doc(bikeId);
        const stationRef = this.db.collection("stations").doc(stationId);

        const activeResQuery = this.db.collection("reservations")
            .where("bikeId", "==", bikeId)
            .where("email", "==", email)
            .where("status", "==", "active")
            .orderBy("startTime", "desc")
            .limit(1);

        await this.db.runTransaction(async (tx) => {

            const [bikeSnap, stationSnap, dockQuerySnap, resQuerySnap] = await Promise.all([
                tx.get(bikeRef),
                tx.get(stationRef),
                tx.get(stationRef.collection("docks").where("status", "==", "empty").limit(1)),
                tx.get(activeResQuery),
            ]);

            if (!bikeSnap.exists) throw new Error("Bike not found.");
            const bike = bikeSnap.data() as Bike;
            if (bike.status !== "on_trip") throw new Error("Bike is not currently in use or not on a trip.");

            if (!stationSnap.exists) throw new Error("Station not found.");
            const station = stationSnap.data() as DockStation;

            if (dockQuerySnap.empty) throw new Error("No available docks at this station.");
            const dockRef = dockQuerySnap.docs[0].ref;


            tx.update(bikeRef, {
                status: "available" as BikeStatus,
                stationId: stationRef.id,
            });


            tx.update(dockRef, {
                status: "occupied",
                bikeId: bikeId,
            });


            const newNumberOfBikes = (station.numberOfBikes ?? 0) + 1;
            const newStatus: StationStatus =
                newNumberOfBikes >= (station.capacity ?? Number.MAX_SAFE_INTEGER)
                    ? "full"
                    : "occupied";

            tx.update(stationRef, {
                numberOfBikes: newNumberOfBikes,
                status: newStatus,
            });


            if (!resQuerySnap.empty) {
                const resDoc = resQuerySnap.docs[0].ref;
                tx.update(resDoc, { status: "completed" });
            }
        });

        // Check station status after return
        const updatedStationSnap = await stationRef.get();
        const updatedStation = updatedStationSnap.data() as DockStation;

        if (updatedStation.status === "full") {
            await createAdminNotification(
                this.db,
                "Station Full",
                `${updatedStation.name} is now full (${updatedStation.numberOfBikes}/${updatedStation.capacity})`
            );
        }

        return {
            ok: true,
            message: "Bike returned successfully, and dock & reservation updated.",
        };
    }
}