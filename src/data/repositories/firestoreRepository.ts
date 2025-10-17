import {Firestore, Timestamp} from "firebase-admin/firestore";
import {adminDb} from "@/data/firebaseAdmin";

export class FirestoreRepository{
    private db : Firestore;

    constructor(){
        this.db = adminDb;
    }

    async getAllDocuments(collectionName:string){
        const snapshot = await this.db.collection(collectionName).get();
        const documents: any[] = [];

        snapshot.forEach((doc) => {
            documents.push({id: doc.id, ...doc.data()});
        });

        return documents;
    }

    async getBikesByStationId(stationId:string){
        try{
            const bikesSnapshot = await this.db.collection("bikes").where("stationId","==",stationId).get();

            const bikes = bikesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            return bikes;
        } catch(error){
            console.error("Error fetching bikes:", error);
        }
    }
}