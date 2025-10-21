"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { db, auth } from "@/data/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import "./notifications.css";

type Notification = {
  id: string;
  title: string;
  message: string;
  date: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Notification)
      );
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const dismissNotification = async (id: string) => {
    await deleteDoc(doc(db, "notifications", id));
  };

  if (loading) {
    return (
      <div className="loadingState">
        Loading notifications...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loginPrompt">
        Please log in to view your notifications.
      </div>
    );
  }

  return (
    <div className="notificationsContainer">
      <div className="notificationsHeader">
        <h1>
          <Bell /> Notifications
        </h1>
      </div>

      <div className="notificationsArea">
        {notifications.length === 0 ? (
          <div className="emptyState">
            You have no notifications
          </div>
        ) : (
          <div className="notificationsList">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                {...notification}
                onDismiss={() => dismissNotification(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  title,
  message,
  date,
  onDismiss,
}: Notification & { onDismiss: () => void }) {
  return (
    <div className="notificationCard">
      <div className="notificationContent">
        <h2 className="notificationTitle">{title}</h2>
        <p className="notificationMessage">{message}</p>
        <p className="notificationDate">{formatDate(date)}</p>
      </div>
      <button
        onClick={onDismiss}
        className="dismissButton"
        title="Delete notification"
      >
        <X />
      </button>
    </div>
  );
}

function formatDate(date: string | Timestamp) {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString();
  }
  return new Date(date).toLocaleString();
}