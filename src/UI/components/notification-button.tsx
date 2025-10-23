"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/data/firebase";
import { onAuthStateChanged } from "firebase/auth";

type UserData = {
    username: string;
    role?: string;
};

export default function NotificationButton() {
    const [unreadCount, setNotificationCount] = useState(0);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setNotificationCount(0);
                return;
            }

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                setNotificationCount(0);
                return;
            }

            const userData = userDoc.data() as UserData;
            const isAdmin = userData.role === "admin";

            const userQuery = query(
                collection(db, "notifications"),
                where("username", "==", userData.username)
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

            {unreadCount > 0 && (
                <span>
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            )}
        </Link>
    );
}