"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Card, CardContent } from "@/UI/components/card";
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
      <main>
        Loading notifications...
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <p>
          Please log in to view your notifications.
        </p>
      </main>
    );
  }

  return (
    <main>
      <div>
        <h1>
          <Bell/> Notifications
        </h1>
      </div>

      {notifications.length === 0 ? (
        <p>
          You have no notifications
        </p>
      ) : (
        <div>
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              {...notification}
              onDismiss={() => dismissNotification(notification.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function NotificationCard({
  title,
  message,
  date,
  onDismiss,
}: Notification & { onDismiss: () => void }) {
  return (
    <Card>
      <CardContent>
        <div>
          <h2>{title}</h2>
          <p>{message}</p>
          <p>{formatDate(date)}</p>
        </div>
        <button
          onClick={onDismiss}
          title="Delete notification"
        >
          <X/>
        </button>
      </CardContent>
    </Card>
  );
}

function formatDate(date: string | Timestamp) {
  if (date instanceof Timestamp) {
    return date.toDate().toLocaleString();
  }
  return new Date(date).toLocaleString();
}
