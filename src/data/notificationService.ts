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

export async function createAdminNotification(title: string, message: string) {
    try {
        const notificationsRef = collection(db, "notifications");

        await addDoc(notificationsRef, {
            title: title,
            message: message,
            date: serverTimestamp(),
            isAdminNotification: true,
        });

        console.log("Admin notification sent successfully");
    } catch (error) {
        console.error("Error creating admin notification:", error);
    }
}
