// For it to run in the browser and not just server-side
"use client";

import { useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert("Login successful!");
        }

        catch (err) {
            console.error(err);
            alert("Login failed. Please make sure the email and password are correct.");
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <h3>Login</h3>

            <div>
                <label>Email address</label>
                <input
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div>
                <label>Password</label>
                <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <div>
                <button type="submit">Login</button>
            </div>

            <p>
                Don’t have an account? <Link href="/register">Register here</Link>
            </p>
        </form>
    );
}
