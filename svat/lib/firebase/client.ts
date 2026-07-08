import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export { firebaseConfig };

const PLACEHOLDER_VALUES = new Set([
  "your_api_key",
  "your_project_id",
  "your_project.firebaseapp.com",
  "your_project.appspot.com",
  "your_sender_id",
  "your_app_id",
]);

export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId, authDomain, appId } = firebaseConfig;
  if (!apiKey || !projectId || !authDomain || !appId) return false;
  if (PLACEHOLDER_VALUES.has(apiKey) || PLACEHOLDER_VALUES.has(projectId)) {
    return false;
  }
  return true;
}

export const FIREBASE_SETUP_MESSAGE =
  "Firebase is not configured. Copy .env.example to .env.local and add your Firebase project credentials.";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase is only available in the browser");
  }
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getClientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}
