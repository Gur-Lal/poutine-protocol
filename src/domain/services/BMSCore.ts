import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";

// Subscriber Interface - Components implement this to receive updates
export interface Subscriber {
    update(data: UpdateData): void;
}

// Update Data Types
export type UpdateData =
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


// BMSCore - Singleton class managing the entire Bike Management System
export class BMSCore {
    // Singleton instance
    private static instance: BMSCore;

    // Subscriber management
    private subscribers: Map<string, Subscriber> = new Map();

    // System state
    private stations: DockStation[] = [];
    private bikesByStation: Map<string, Bike[]> = new Map();

    private constructor() {
        console.log('BMSCore initialized');
    }

    public static getInstance(): BMSCore {
        if (!BMSCore.instance) {
            BMSCore.instance = new BMSCore();
        }
        return BMSCore.instance;
    }

    // OBSERVER PATTERN METHODS=

    public subscribe(subscriberId: string, subscriber: Subscriber): void {
        this.subscribers.set(subscriberId, subscriber);
        console.log(`Subscriber '${subscriberId}' added. Total subscribers: ${this.subscribers.size}`);

        // Send initial data to new subscriber
        if (this.stations.length > 0) {
            subscriber.update({
                type: 'STATIONS_UPDATE',
                stations: this.stations,
                timestamp: new Date()
            });
        }
    }

    public unsubscribe(subscriberId: string): void {
        const removed = this.subscribers.delete(subscriberId);
        if (removed) {
            console.log(`Subscriber '${subscriberId}' removed. Total subscribers: ${this.subscribers.size}`);
        }
    }

    private notifySubscribers(data: UpdateData): void {
        console.log(`Notifying ${this.subscribers.size} subscribers of ${data.type}`);

        let notifiedCount = 0;
        this.subscribers.forEach((subscriber, id) => {
            try {
                subscriber.update(data);
                notifiedCount++;
            } catch (error) {
                console.error(`Error notifying subscriber '${id}':`, error);
            }
        });

        console.log(`Successfully notified ${notifiedCount}/${this.subscribers.size} subscribers`);
    }

    // STATION MANAGEMENT 

    public publishStations(stations: DockStation[]): void {
        this.stations = stations;

        const updateData: StationsUpdate = {
            type: 'STATIONS_UPDATE',
            stations: stations,
            timestamp: new Date()
        };

        this.notifySubscribers(updateData);
    }

    // Update a specific station and notify subscribers
    public updateStation(stationId: string, updatedStation: DockStation): void {
        const index = this.stations.findIndex(s => s.id === stationId);

        if (index !== -1) {
            this.stations[index] = updatedStation;
            console.log(`Station '${updatedStation.name}' updated`);
            this.publishStations(this.stations);
        } else {
            console.warn(`Station with ID '${stationId}' not found`);
        }
    }

    // Add a new station and notify subscribers
    public addStation(station: DockStation): void {
        this.stations.push(station);
        console.log(`Station '${station.name}' added`);
        this.publishStations(this.stations);
    }

    // Remove a station and notify subscribers
    public removeStation(stationId: string): void {
        const beforeLength = this.stations.length;
        this.stations = this.stations.filter(s => s.id !== stationId);

        if (this.stations.length < beforeLength) {
            console.log(`Station removed`);
            this.publishStations(this.stations);
        }
    }

    public getStations(): DockStation[] {
        return this.stations;
    }

    public getStation(stationId: string): DockStation | undefined {
        return this.stations.find(s => s.id === stationId);
    }

    // BIKE MANAGEMENT
    public publishBikes(stationId: string, bikes: Bike[]): void {
        this.bikesByStation.set(stationId, bikes);

        const updateData: BikeUpdate = {
            type: 'BIKE_UPDATE',
            stationId: stationId,
            bikes: bikes,
            timestamp: new Date()
        };

        this.notifySubscribers(updateData);
    }

    public getBikes(stationId: string): Bike[] | undefined {
        return this.bikesByStation.get(stationId);
    }

    // RESERVATIONS
    public publishReservation(
        userId: string,
        bikeId: string,
        action: 'RESERVED' | 'UNLOCKED' | 'RETURNED' | 'CANCELLED'
    ): void {
        const updateData: ReservationUpdate = {
            type: 'RESERVATION_UPDATE',
            userId: userId,
            bikeId: bikeId,
            action: action,
            timestamp: new Date()
        };

        console.log(`Reservation ${action} for user ${userId}, bike ${bikeId}`);
        this.notifySubscribers(updateData);
    }

    // SYSTEM UPDATES

    // System-wide update
    public publishSystemUpdate(message: string): void {
        const updateData: SystemUpdate = {
            type: 'SYSTEM_UPDATE',
            message: message,
            timestamp: new Date()
        };

        console.log(`System update: ${message}`);
        this.notifySubscribers(updateData);
    }

    public getSubscriberCount(): number {
        return this.subscribers.size;
    }

    public getSubscriberIds(): string[] {
        return Array.from(this.subscribers.keys());
    }
}

// Export singleton instance for easy access
export const bmsCore = BMSCore.getInstance();