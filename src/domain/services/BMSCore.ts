import { DockStation } from "@/domain/models/DockStation";
import { Bike } from "@/domain/models/Bike";
import { Firestore } from "firebase-admin/firestore";

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

    // Subscriber management
    private subscribers: Map<string, Subscriber> = new Map();

    // System state
    private db: Firestore;

    constructor(db: Firestore) {
        this.db = db;
        console.log('BMSCore initialized');
    }

    // OBSERVER PATTERN METHODS

    public subscribe(subscriberId: string, subscriber: Subscriber): void {
        this.subscribers.set(subscriberId, subscriber);
        console.log(`Subscriber '${subscriberId}' added. Total subscribers: ${this.subscribers.size}`);

        // Send initial data to new subscriber
        this.sendInitialData(subscriber);
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

    // Fetch daa from the DB
    private async sendInitialData(subscriber: Subscriber): Promise<void> {
        const stations = await this.fetchStationsFromDB();
        if (stations.length > 0) {
            subscriber.update({
                type: 'STATIONS_UPDATE',
                stations: stations,
                timestamp: new Date()
            });
        }
    }

    // STATION MANAGEMENT 

    public async publishStations(): Promise<void> {
        const stations = await this.fetchStationsFromDB();
        const updateData: StationsUpdate = {
            type: 'STATIONS_UPDATE',
            stations: stations,
            timestamp: new Date()
        };

        this.notifySubscribers(updateData);
    }


    private async fetchStationsFromDB(): Promise<DockStation[]> {
        const snapshot = await this.db.collection('stations').get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as DockStation));
    }

    // Update a specific station and notify subscribers
    public async updateStation(stationId: string, updates: Partial<DockStation>): Promise<void> {
        await this.db.collection('stations').doc(stationId).update(updates);

        const updatedStation = await this.db.collection('stations').doc(stationId).get();

        if (updatedStation.exists) {
            console.log(`Station updated in database`);
            await this.publishStations();
        }
    }

    public async addStation(station: DockStation): Promise<void> {
        await this.db.collection('stations').add(station);
        console.log(`Station '${station.name}' added to database`);
        await this.publishStations();
    }

    // Remove a station and notify subscribers
    public async removeStation(stationId: string): Promise<void> {
        await this.db.collection('stations').doc(stationId).delete();
        console.log(`Station removed from database`);
        await this.publishStations();
    }

    public async getStations(): Promise<DockStation[]> {
        return this.fetchStationsFromDB();
    }

    public async getStation(stationId: string): Promise<DockStation | undefined> {
        const doc = await this.db.collection('stations').doc(stationId).get();
        if (!doc.exists) return undefined;
        return { id: doc.id, ...doc.data() } as DockStation;
    }

    // BIKE MANAGEMENT
    public async publishBikes(stationId: string): Promise<void> {
        const bikes = await this.fetchBikesFromDB(stationId);

        const updateData: BikeUpdate = {
            type: 'BIKE_UPDATE',
            stationId: stationId,
            bikes: bikes,
            timestamp: new Date()
        };

        this.notifySubscribers(updateData);
    }

    private async fetchBikesFromDB(stationId: string): Promise<Bike[]> {
        const snapshot = await this.db.collection('bikes')
            .where('stationId', '==', stationId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Bike));
    }

    public async getBikes(stationId: string): Promise<Bike[]> {
        return this.fetchBikesFromDB(stationId);
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