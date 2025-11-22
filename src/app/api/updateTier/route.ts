import { NextResponse } from "next/server";
import { assignTier } from "@/domain/services/tierService";
import { getRiderStats } from "@/domain/services/riderStatsService";
import { Tier } from "@/domain/models/UserData";
import { adminDb } from "@/data/firebaseAdmin";
import { updateRiderTier } from "@/domain/services/tierService";

export async function POST(req: Request) {
    try {
        const {email} = await req.json();
        
        if (!email) {
            return NextResponse.json({ error: "Missing email" }, { status: 400 });
        }

        const tier = await updateRiderTier(email);
        return NextResponse.json({tier});

    } catch (error) {
        return NextResponse.json(
            {error: (error as Error).message},
            {status:500}
        );
    }
}
