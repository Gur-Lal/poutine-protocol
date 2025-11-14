import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { ok: false, error: "userId is required" },
                { status: 400 }
            );
        }

        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const role = userData?.role || "rider";
        const activeRole = userData?.activeRole || (role === "dual" ? "rider" : role);

        return NextResponse.json({
            ok: true,
            role,
            activeRole,
            isDualRole: role === "dual"
        });
    } catch (error) {
        console.error("Error fetching active role:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId, activeRole } = await request.json();

        if (!userId || !activeRole) {
            return NextResponse.json(
                { ok: false, error: "userId and activeRole are required" },
                { status: 400 }
            );
        }

        if (!["operator", "rider"].includes(activeRole)) {
            return NextResponse.json(
                { ok: false, error: "activeRole must be 'operator' or 'rider'" },
                { status: 400 }
            );
        }

        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { ok: false, error: "User not found" },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const role = userData?.role;

        if (role !== "dual") {
            return NextResponse.json(
                { ok: false, error: "User is not a dual-role user" },
                { status: 403 }
            );
        }

        await adminDb.collection("users").doc(userId).update({
            activeRole: activeRole
        });

        return NextResponse.json({
            ok: true,
            message: `Active role switched to ${activeRole}`,
            activeRole
        });
    } catch (error) {
        console.error("Error switching active role:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}