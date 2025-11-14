"use client";

import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import "./roleToggle.css";

interface RoleToggleProps {
    user: User;
    onRoleChange?: (newRole: "operator" | "rider") => void;
}

export default function RoleToggle({ user, onRoleChange }: RoleToggleProps) {
    const [isDualRole, setIsDualRole] = useState(false);
    const [activeRole, setActiveRole] = useState<"operator" | "rider">("rider");
    const [isLoading, setIsLoading] = useState(true);
    const [isSwitching, setIsSwitching] = useState(false);

    useEffect(() => {
        checkUserRole();
    }, [user]);

    const checkUserRole = async () => {
        try {
            const response = await fetch(`/api/activeRole?userId=${user.uid}`);
            const data = await response.json();

            if (data.ok) {
                setIsDualRole(data.isDualRole);
                setActiveRole(data.activeRole);
            }
        } catch (error) {
            console.error("Error checking user role:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleSwitch = async (newRole: "operator" | "rider") => {
        if (isSwitching || newRole === activeRole) return;

        setIsSwitching(true);
        try {
            const response = await fetch("/api/activeRole", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user.uid,
                    activeRole: newRole,
                }),
            });

            const data = await response.json();

            if (data.ok) {
                setActiveRole(newRole);
                if (onRoleChange) {
                    onRoleChange(newRole);
                }
                // Reload the page to refresh all data
                window.location.reload();
            } else {
                console.error("Failed to switch role:", data.error);
                alert("Failed to switch role. Please try again.");
            }
        } catch (error) {
            console.error("Error switching role:", error);
            alert("An error occurred while switching roles.");
        } finally {
            setIsSwitching(false);
        }
    };

    if (isLoading) {
        return <div className="roleToggleLoading">Loading role...</div>;
    }

    if (!isDualRole) {
        return null; // Don't show the toggle for non-dual-role users
    }

    return (
        <div className="roleToggleContainer">
            <div className="roleToggleLabel">Active Role:</div>
            <div className="roleToggleButtons">
                <button
                    className={`roleToggleButton ${activeRole === "rider" ? "active" : ""
                        }`}
                    onClick={() => handleRoleSwitch("rider")}
                    disabled={isSwitching || activeRole === "rider"}
                >
                    Rider
                </button>
                <button
                    className={`roleToggleButton ${activeRole === "operator" ? "active" : ""
                        }`}
                    onClick={() => handleRoleSwitch("operator")}
                    disabled={isSwitching || activeRole === "operator"}
                >
                    Operator
                </button>
            </div>
            {activeRole === "rider" && (
                <div className="roleToggleBadge dualRoleBadge">
                    10% Dual-Role Discount Active
                </div>
            )}
        </div>
    );
}