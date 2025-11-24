import { adminDb } from "@/data/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export async function createServerNotification(email: string, title: string, message: string){
    try{
        await adminDb.collection("notifications").add({
            email, title, message, date: Timestamp.now(), isAdminNotification: false,
        });
    } catch (error){
        console.error("Error creating server notification:", error);
    }
}