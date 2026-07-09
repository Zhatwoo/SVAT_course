import "server-only";

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  getAdminProjectId,
  getAdminStorageBucket,
  isFirebaseAdminConfigured,
} from "./admin-config";

export { isFirebaseAdminConfigured };

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = getAdminProjectId();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const storageBucket = getAdminStorageBucket();

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env.local (generate a service account key in Firebase Console).",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
