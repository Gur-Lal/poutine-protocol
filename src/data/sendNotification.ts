import { db } from "@/data/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function sendNotification(
  userId: string,
  title: string,
  message: string
) {
  try {
    const notificationsRef = collection(db, "notifications");

    await addDoc(notificationsRef, {
      userId,
      title,
      message,
      date: serverTimestamp(),
    });

    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
