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
      <main className="max-w-3xl mx-auto p-6 text-center text-gray-500">
        Loading notifications...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-gray-500">
          Please log in to view your notifications.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">
          You have no notifications
        </p>
      ) : (
        <div className="space-y-3">
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
  id,
  title,
  message,
  date,
  onDismiss,
}: Notification & { onDismiss: () => void }) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4 flex justify-between items-start">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-gray-600">{message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(date)}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Delete notification"
        >
          <X className="w-4 h-4" />
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
