"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/data/firebase";
import { User as UserIcon, LogOut, Mail, MapPin, Shield } from "lucide-react";
import "./AccountButton.css";

interface AccountButtonProps {
    user: User;
    onLogout: () => void;
}

export default function AccountButton({ user, onLogout }: AccountButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUserData();
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const fetchUserData = async () => {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setUserData(userDoc.data());
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="accountButtonLoading">Loading...</div>;
    }

    return (
        <div className="accountButtonContainer" ref={dropdownRef}>
            <button className="accountButton" onClick={() => setIsOpen(!isOpen)}>
                <UserIcon size={20} />
                <span>Account</span>
            </button>

            {isOpen && (
                <div className="accountDropdown">
                    <div className="accountHeader">
                        <div className="accountAvatar">
                            <UserIcon size={32} />
                        </div>
                        <div>
                            <h3 className="accountName">
                                {userData?.firstName} {userData?.lastName}
                            </h3>
                            <div className={`roleBadge ${userData?.role}`}>
                                <Shield size={12} />
                                {userData?.role === "admin" ? "ADMIN" : "RIDER"}
                            </div>
                        </div>
                    </div>

                    <div className="accountDivider"></div>

                    <div className="accountInfo">
                        <div className="accountInfoItem">
                            <UserIcon size={16} />
                            <div>
                                <div className="accountLabel">Username</div>
                                <div className="accountValue">{userData?.username || "N/A"}</div>
                            </div>
                        </div>

                        <div className="accountInfoItem">
                            <Mail size={16} />
                            <div>
                                <div className="accountLabel">Email</div>
                                <div className="accountValue">{user.email}</div>
                            </div>
                        </div>

                        <div className="accountInfoItem">
                            <MapPin size={16} />
                            <div>
                                <div className="accountLabel">Address</div>
                                <div className="accountValue">{userData?.address || "No address"}</div>
                            </div>
                        </div>
                    </div>

                    <div className="accountDivider"></div>

                    <button className="logoutButton" onClick={onLogout}>
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}