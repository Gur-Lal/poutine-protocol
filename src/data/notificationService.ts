import { db } from "@/data/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function createNotification(username: string, title: string, message: string) {
    try {
        const notificationsRef = collection(db, "notifications");

        await addDoc(notificationsRef, {
            username: username,
            title: title,
            message: message,
            date: serverTimestamp(),
            isAdminNotification: false,
        });

        console.log("Notification sent successfully");
    } catch (error) {
        console.error("Error sending notification: ", error);
    }
}
