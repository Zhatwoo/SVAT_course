import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  firebaseConfig,
  isFirebaseConfigured,
  FIREBASE_SETUP_MESSAGE,
} from "./client";

const SECONDARY_APP_NAME = "admin-register";

function getSecondaryApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);
  if (existing) return existing;
  return initializeApp(firebaseConfig, SECONDARY_APP_NAME);
}

/** Create a Firebase Auth user without switching the current admin session. */
export async function createAuthUserWithoutSessionSwitch(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const secondaryApp = getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);

  const credential = await createUserWithEmailAndPassword(
    secondaryAuth,
    email.trim().toLowerCase(),
    password,
  );
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await signOut(secondaryAuth);

  return credential.user;
}
