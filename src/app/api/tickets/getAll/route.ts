import { NextResponse } from "next/server";
import { adminDb } from "@/data/firebaseAdmin";

export async function GET() {
  try {
    const snap = await adminDb.collection("tickets").get();

    const tickets = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ ok: true, tickets });
  } catch (error) {
    console.error("Error loading tickets:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
