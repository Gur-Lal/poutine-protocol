"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "@/data/firebase";

export default function NotificationButton() {
  const [unreadCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "notifications"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotificationCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Link
      href="/dashboard/notifications"
      title="View Notifications"
    >
      <Bell/>

      {unreadCount > 0 && (
        <span>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
