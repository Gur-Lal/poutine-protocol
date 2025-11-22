import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: "pedal-to-the-mtl.firebaseapp.com",
    projectId: "pedal-to-the-mtl",
    storageBucket: "pedal-to-the-mtl.firebasestorage.app",
    messagingSenderId: "625823493809",
    appId: "1:625823493809:web:87cfbfcd0e8d6e5e5b3c90",
    measurementId: "G-TXFN76875L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;