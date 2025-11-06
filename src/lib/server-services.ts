import { adminDb } from "@/data/firebaseAdmin";
import { BMSCore } from "@/domain/services/BMSCore";

export const bmsCore = new BMSCore(adminDb);