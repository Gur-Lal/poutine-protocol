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
}