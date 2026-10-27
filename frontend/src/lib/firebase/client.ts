import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase is initialised lazily. `getAuth()` throws `auth/invalid-api-key` when the
// NEXT_PUBLIC_FIREBASE_* variables are missing, so calling it at module load would
// crash every page — including the mock-auth demo that does not use Firebase at all.
// Only code paths that really need Firebase call getFirebaseAuth().

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    if (!firebaseConfig.apiKey) {
      throw new Error(
        "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in frontend/.env.local, or use NEXT_PUBLIC_USE_MOCK_AUTH=true."
      );
    }
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}
