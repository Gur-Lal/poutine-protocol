import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/data/firebaseAdmin"; // ensure you export both
import { v4 as uuid } from "uuid";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const subject = form.get("subject") as string;
    const description = form.get("description") as string;
    const userId = form.get("userId") as string;
    const file = form.get("image") as File | null;

    let imageUrl: string | null = null;

    // ---------- IMAGE UPLOAD HANDLING ----------
    if (file && typeof file === "object") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const bucket = adminStorage.bucket();
      const fileName = `tickets/${uuid()}-${file.name}`;

      const upload = bucket.file(fileName);

      await upload.save(buffer, {
        metadata: {
          contentType: file.type,
        },
      });

      // Generate a signed download URL
      const [url] = await upload.getSignedUrl({
        action: "read",
        expires: "03-01-2030",
      });

      imageUrl = url;
    }

    // ---------- FIRESTORE SAVE ----------
    await adminDb.collection("tickets").add({
      userId,
      subject,
      description,
      imageUrl,
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Ticket create error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}