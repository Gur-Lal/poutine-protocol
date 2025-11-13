import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";

// Client-side observer (no database access)
export interface ClientSubscriber {
    update(data: ClientUpdateData): void;
}

export type ClientUpdateData =
    | StationsUpdate
    | BikeUpdate
    | ReservationUpdate
    | SystemUpdate;

export interface StationsUpdate {
    type: 'STATIONS_UPDATE';
    stations: DockStation[];
    timestamp: Date;
}

export interface BikeUpdate {
    type: 'BIKE_UPDATE';
    stationId: string;
    bikes: Bike[];
    timestamp: Date;
}

export interface ReservationUpdate {
    type: 'RESERVATION_UPDATE';
    userId: string;
    bikeId: string;
    action: 'RESERVED' | 'UNLOCKED' | 'RETURNED' | 'CANCELLED';
    timestamp: Date;
}

export interface SystemUpdate {
    type: 'SYSTEM_UPDATE';
    message: string;
    timestamp: Date;
}

class ClientBMSObserver {
    private subscribers: Map<string, ClientSubscriber> = new Map();

    subscribe(subscriberId: string, subscriber: ClientSubscriber): void {
        this.subscribers.set(subscriberId, subscriber);
        console.log(`Client subscriber '${subscriberId}' added`);
    }

    unsubscribe(subscriberId: string): void {
        this.subscribers.delete(subscriberId);
        console.log(`Client subscriber '${subscriberId}' removed`);
    }

    // Called when data updates come from API
    notify(data: ClientUpdateData): void {
        this.subscribers.forEach((subscriber) => {
            subscriber.update(data);
        });
    }
}

export const clientObserver = new ClientBMSObserver();