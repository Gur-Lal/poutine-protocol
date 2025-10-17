import { FirestoreRepository } from "./repositories/firestoreRepository";

export class FirestoreService{
    private repository : FirestoreRepository;

    constructor(){
        this.repository = new FirestoreRepository();
    }

    async getDocuments(collectionName: string){
        const documents = this.repository.getAllDocuments(collectionName);
        return documents;
    }

    async getBikesByStationId(stationId:string){
        const bikes = this.repository.getBikesByStationId(stationId);
        return bikes;
    }

    async getReservationByUsername(username: string){
        const reservation = this.repository.getReservationByUsername(username);
        return reservation;
    }
}