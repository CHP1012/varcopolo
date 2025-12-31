import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase config is available
const isFirebaseConfigured = firebaseConfig.projectId && firebaseConfig.storageBucket;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured) {
    // Initialize Firebase (Singleton pattern to avoid multiple instances during HMR)
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);

    // Analytics (only supported in browser environment)
    if (typeof window !== 'undefined') {
        isSupported().then((supported) => {
            if (supported && app) {
                analytics = getAnalytics(app);
            }
        });
    }
} else {
    console.warn("[Firebase] Configuration missing. Firebase features disabled. Add NEXT_PUBLIC_FIREBASE_* env vars to client/.env.local");
}

export { app, db, storage, analytics, isFirebaseConfigured };
