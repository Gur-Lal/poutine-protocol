import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

export async function GET(
    request: NextRequest,
    context: { params: { userId: string } }
) {
    try {
        const { userId } = await context.params;

        const userDoc = await adminDb.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ role: "rider" });
        }

        const userData = userDoc.data();
        const role = userData?.role || "rider";

        return NextResponse.json({ role });
    } catch (error) {
        console.error("Error fetching user role:", error);
        return NextResponse.json({ role: "rider" });
    }
}