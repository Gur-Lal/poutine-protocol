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
}