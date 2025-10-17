import { Firestore, Transaction } from "firebase-admin/firestore";
import { Bike, BikeStatus } from "../models/Bike";
import { DockStation, StationStatus } from "../models/DockStation";

export class AdminService {
    private db: Firestore;

    constructor(database: Firestore) {
        this.db = database;
    }

    // Move a bike from one station to another
    async moveBike(args: {
        bikeId: string;
        sourceStationId: string;
        destinationStationId: string;
    }) {
        const bikeId = args.bikeId;
        const sourceStationId = args.sourceStationId;
        const destinationStationId = args.destinationStationId;

        // Make sure that the source and destination are different
        if (sourceStationId === destinationStationId) {
            throw new Error("Source and destination stations cannot be the same");
        }

        // Get references to the stations and bike
        const sourceStationRef = this.db.collection("stations").doc(sourceStationId);
        const destStationRef = this.db.collection("stations").doc(destinationStationId);
        const bikeRef = this.db.collection("bikes").doc(bikeId);

        const result = await this.db.runTransaction(async (transaction: Transaction) => {
            const sourceDoc = await transaction.get(sourceStationRef);
            const destDoc = await transaction.get(destStationRef);
            const bikeDoc = await transaction.get(bikeRef);

            // Make sure that everything exists
            if (!sourceDoc.exists) {
                throw new Error("Source station not found");
            }
            if (!destDoc.exists) {
                throw new Error("Destination station not found");
            }
            if (!bikeDoc.exists) {
                throw new Error("Bike not found");
            }

            // Get the data from the documents retrieved above 
            const sourceStation = sourceDoc.data() as DockStation;
            const destStation = destDoc.data() as DockStation;
            const bike = bikeDoc.data() as Bike & { stationId?: string };

            // Check if the source station is valid to move bikes from 
            if (sourceStation.status === "out_of_service") {
                throw new Error("Source station is out of service");
            }

            if (sourceStation.numberOfBikes <= 0) {
                throw new Error("Source station has no bikes");
            }

            // Check if the destination station is valid
            if (destStation.status === "out_of_service") {
                throw new Error("Destination station is out of service");
            }
            if (destStation.numberOfBikes >= destStation.capacity) {
                throw new Error("Destination station is full");
            }

            // Check if the bike is valid (for example, cannot move a bike that is on a trip or reserved)
            if (bike.status !== "available") {
                throw new Error("Only available bikes can be moved");
            }

            if (bike.stationId !== sourceStationId) {
                throw new Error("Bike is not at the source station");
            }

            // Update bike's station
            transaction.update(bikeRef, {
                stationId: destinationStationId,
            });

            // Update source station
            const newSourceBikes = sourceStation.numberOfBikes - 1;
            let newSourceStatus: StationStatus;

            if (newSourceBikes <= 0) {
                newSourceStatus = "empty";
            }
            else if (newSourceBikes >= sourceStation.capacity) {
                newSourceStatus = "full";
            }
            else {
                newSourceStatus = "occupied";
            }

            transaction.update(sourceStationRef, {
                numberOfBikes: newSourceBikes,
                status: newSourceStatus,
            });

            // Free up a dock at source station
            const sourceDockQuery = await sourceStationRef
                .collection("docks")
                .where("status", "==", "occupied")
                .limit(1)
                .get();

            // If occupied dock is found - mark it empty
            if (!sourceDockQuery.empty) {
                const sourceDockRef = sourceDockQuery.docs[0].ref;
                transaction.update(sourceDockRef, {
                    status: "empty",
                    bikeId: null,
                });
            }

            // Update destination station
            const newDestBikes = destStation.numberOfBikes + 1;
            let newDestStatus: StationStatus;

            if (newDestBikes <= 0) {
                newDestStatus = "empty";
            }
            else if (newDestBikes >= destStation.capacity) {
                newDestStatus = "full";
            }
            else {
                newDestStatus = "occupied";
            }

            transaction.update(destStationRef, {
                numberOfBikes: newDestBikes,
                status: newDestStatus,
            });

            // Occupy a dock at destination station
            const destDockQuery = await destStationRef
                .collection("docks")
                .where("status", "==", "empty")
                .limit(1)
                .get();

            if (!destDockQuery.empty) {
                const destDockRef = destDockQuery.docs[0].ref;
                transaction.update(destDockRef, {
                    status: "occupied",
                    bikeId: bikeId,
                });
            }

            return {
                ok: true,
                message: "Bike moved successfully",
            };
        });

        return result;
    }

    // Send bike to maintenance or remove it from maintenance
    async setBikeMaintenance(args: { bikeId: string; inMaintenance: boolean }) {
        const bikeId = args.bikeId;
        const inMaintenance = args.inMaintenance;

        const bikeRef = this.db.collection("bikes").doc(bikeId);
        const bikeDoc = await bikeRef.get();

        if (!bikeDoc.exists) {
            throw new Error("Bike not found");
        }

        const bike = bikeDoc.data() as Bike & { stationId?: string };

        // If sending bike to maintenance
        if (inMaintenance) {
            // Check if the bike can be sent to maintenance
            if (bike.status === "on_trip" || bike.status === "reserved") {
                throw new Error("Cannot send bike to maintenance while in use or reserved");
            }

            // Update bike status to maintenance
            await bikeRef.update({
                status: "maintenance" as BikeStatus,
            });

            // If bike was at a station, update that station's status on number of bikes
            if (bike.stationId) {
                const stationRef = this.db.collection("stations").doc(bike.stationId);

                await this.db.runTransaction(async (transaction) => {
                    const stationDoc = await transaction.get(stationRef);

                    if (!stationDoc.exists) {
                        throw new Error("Station not found");
                    }

                    // Remove one bike from availabilities
                    const station = stationDoc.data() as DockStation;
                    const newNumberOfBikes = station.numberOfBikes - 1;

                    // Calculate new station status
                    let newStatus: StationStatus;
                    if (newNumberOfBikes <= 0) {
                        newStatus = "empty";
                    }
                    else if (newNumberOfBikes >= station.capacity) {
                        newStatus = "full";
                    }
                    else {
                        newStatus = "occupied";
                    }

                    transaction.update(stationRef, {
                        numberOfBikes: newNumberOfBikes,
                        status: newStatus,
                    });

                    // Free up the dock
                    const dockQuery = await stationRef
                        .collection("docks")
                        .where("status", "==", "occupied")
                        .limit(1)
                        .get();

                    if (!dockQuery.empty) {
                        const dockRef = dockQuery.docs[0].ref;  // First doc found
                        transaction.update(dockRef, {
                            status: "empty",    // Mark dock as empty
                            bikeId: null,       // Remove bike from dock (dock does not have a bike with a bike id)
                        });
                    }
                });
            }
        }

        else {
            // Removing bike from maintenance - set to available
            await bikeRef.update({
                status: "available" as BikeStatus,
            });

            // If bike has a station, update that station to reflect the bike being available again
            if (bike.stationId) {
                const stationRef = this.db.collection("stations").doc(bike.stationId);

                await this.db.runTransaction(async (transaction) => {
                    const stationDoc = await transaction.get(stationRef);

                    if (!stationDoc.exists) {
                        throw new Error("Station not found");
                    }

                    const station = stationDoc.data() as DockStation;
                    const newNumberOfBikes = station.numberOfBikes + 1;

                    // Calculate new station status
                    let newStatus: StationStatus;
                    if (newNumberOfBikes <= 0) {
                        newStatus = "empty";
                    } else if (newNumberOfBikes >= station.capacity) {
                        newStatus = "full";
                    } else {
                        newStatus = "occupied";
                    }

                    transaction.update(stationRef, {
                        numberOfBikes: newNumberOfBikes,
                        status: newStatus,
                    });

                    // Occupy a dock
                    const dockQuery = await stationRef
                        .collection("docks")
                        .where("status", "==", "empty")
                        .limit(1)
                        .get();

                    if (!dockQuery.empty) {
                        const dockRef = dockQuery.docs[0].ref;
                        transaction.update(dockRef, {
                            status: "occupied",
                            bikeId: bikeId,
                        });
                    }
                });
            }
        }

        const message = inMaintenance ? "Bike sent to maintenance" : "Bike removed from maintenance";

        return {
            ok: true,
            message: message,
        };
    }

    // Mark a station as out of service or restore it
    async setStationService(args: { stationId: string; outOfService: boolean }) {
        const stationId = args.stationId;
        const outOfService = args.outOfService;

        const stationRef = this.db.collection("stations").doc(stationId);
        const stationDoc = await stationRef.get();

        if (!stationDoc.exists) {
            throw new Error("Station not found");
        }

        const station = stationDoc.data() as DockStation;

        // Calculate new status
        let newStatus: StationStatus;

        if (outOfService) {
            newStatus = "out_of_service";
        }

        else {
            if (station.numberOfBikes <= 0) {
                newStatus = "empty";
            }
            else if (station.numberOfBikes >= station.capacity) {
                newStatus = "full";
            }
            else {
                newStatus = "occupied";
            }
        }

        // Update the status of the station in FireStore
        await stationRef.update({
            status: newStatus,
        });

        const message = outOfService ? "Station marked as out of service" : "Station restored to service";

        return {
            ok: true,
            message: message,
        };
    }
}