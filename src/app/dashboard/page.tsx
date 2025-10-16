"use client";

import { useState, useEffect } from "react";
import { auth } from "@/data/firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
    const [userName, setUserName] = useState("");
    const router = useRouter();

    // Listen for login state one time when the component loads
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // show display name if available else just display email
                setUserName(user.displayName || user.email || "");
            } else {
                // If not logged in then go back to login page
                router.push("/login");
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [router]);

    if (!userName) {
        return <p style={{ textAlign: "center", padding: "3rem" }}>Loading...</p>;
    }

    return (
        <main style={{ textAlign: "center", padding: "3rem" }}>
            <h1>Hello, {userName}!</h1>
            <p>Welcome!</p>
        </main>
    );
}