"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/data/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { UserData } from "@/domain/models/UserData";

export default function NotificationButton() {
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user?.email) {
                setNotificationCount(0);
                return;
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            const isAdmin = userDoc.exists() && (userDoc.data() as UserData).role === "admin";

            const userQuery = query(
                collection(db, "notifications"),
                where("email", "==", user.email)
            );

            const adminQuery = isAdmin
                ? query(
                    collection(db, "notifications"),
                    where("isAdminNotification", "==", true)
                )
                : null;

            let userCount = 0;
            let adminCount = 0;

            const unsubUser = onSnapshot(userQuery, (snapshot) => {
                userCount = snapshot.size;
                setNotificationCount(userCount + adminCount);
            });

            let unsubAdmin: (() => void) | null = null;
            if (adminQuery) {
                unsubAdmin = onSnapshot(adminQuery, (snapshot) => {
                    adminCount = snapshot.size;
                    setNotificationCount(userCount + adminCount);
                });
            }

            return () => {
                unsubUser();
                if (unsubAdmin) unsubAdmin();
            };
        });

        return () => unsubscribeAuth();
    }, []);

    return (
        <Link
            href="/dashboard/notifications"
            title="View Notifications"
        >
            <Bell />

            {notificationCount > 0 && (
                <span>
                    {notificationCount > 9 ? "9+" : notificationCount}
                </span>
            )}
        </Link>
    );
}