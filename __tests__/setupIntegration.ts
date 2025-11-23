import { adminDb } from "@/data/firebaseAdmin";

beforeAll(async () => {
  await adminDb.listCollections();
});

afterAll(async () => {
  await adminDb.terminate();
});
