// src/app/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../data/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [fname, setFname] = useState("");
    const [lname, setLname] = useState("");
    const [address, setAddress] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password || !fname || !lname) {
            setError("Please fill in the first name, last name, email and password.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: `${fname} ${lname}`.trim() });

            await setDoc(doc(db, "users", cred.user.uid), {
                uid: cred.user.uid,
                email: cred.user.email,
                firstName: fname,
                lastName: lname,
                username: username,
                address: address,
                createdAt: serverTimestamp(),
            });

            alert("Registration successful!");

        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Failed to register.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleRegister}>
            <h3>Create Account</h3>

            <div>
                <label>First Name</label>
                <input type="text" value={fname} onChange={(e) => setFname(e.target.value)} required />
            </div>

            <div>
                <label>Last Name</label>
                <input type="text" value={lname} onChange={(e) => setLname(e.target.value)} required />
            </div>

            <div>
                <label>Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>

            <div>
                <label>Address</label>
                <input
                    type="text"
                    placeholder="123 Main St, Springfield"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>

            <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
                <label>Password</label>
                <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <div>
                <label>Confirm Password</label>
                <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                />
            </div>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <div>
                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Register"}
                </button>
            </div>

            <p>
                Already have an account? <Link href="/login">Login</Link>
            </p>
        </form>
    );
}
