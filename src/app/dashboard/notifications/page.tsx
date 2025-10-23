"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { db, auth } from "@/data/firebase";
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, Timestamp, getDoc, } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import "./notifications.css";

type Notification = {
    id: string;
    title: string;
    message: string;
    date: string;
    isAdminNotification?: boolean;
};

type UserData = {
    username: string;
    role?: string;
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data() as UserData);
                }
            } else {
                setUserData(null);
            }

            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !userData) {
            setNotifications([]);
            return;
        }

        const isAdmin = userData.role === "admin";

        const userQuery = query(
            collection(db, "notifications"),
            where("username", "==", userData.username),
            orderBy("date", "desc")
        );

        const adminQuery = isAdmin
            ? query(
                collection(db, "notifications"),
                where("isAdminNotification", "==", true),
                orderBy("date", "desc")
            )
            : null;

        const unsubscribers: (() => void)[] = [];

        const unsubUser = onSnapshot(userQuery, (snapshot) => {
            const userNotifs = snapshot.docs.map(
                (doc) =>
                ({
                    id: doc.id,
                    ...doc.data(),
                } as Notification)
            );

            if (!isAdmin) {
                setNotifications(userNotifs);
            } else {
                setNotifications((prev) => {
                    const adminNotifs = prev.filter((n) => n.isAdminNotification);
                    return [...userNotifs, ...adminNotifs].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                });
            }
        });
        unsubscribers.push(unsubUser);

        if (adminQuery) {
            const unsubAdmin = onSnapshot(adminQuery, (snapshot) => {
                const adminNotifs = snapshot.docs.map(
                    (doc) =>
                    ({
                        id: doc.id,
                        ...doc.data(),
                    } as Notification)
                );

                setNotifications((prev) => {
                    const userNotifs = prev.filter((n) => !n.isAdminNotification);
                    return [...userNotifs, ...adminNotifs].sort(
                        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                    );
                });
            });
            unsubscribers.push(unsubAdmin);
        }

        return () => unsubscribers.forEach((unsub) => unsub());
    }, [user, userData]);

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