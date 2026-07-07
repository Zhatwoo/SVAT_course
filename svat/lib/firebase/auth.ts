import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { validateSignupForm } from "../auth/validation";
import {
  getClientAuth,
  getClientDb,
  isFirebaseConfigured,
  FIREBASE_SETUP_MESSAGE,
} from "./client";
import { registerUserRole } from "../firestore/roles";

const SESSION_COOKIE = "__session";

export async function setSessionCookie(user: User) {
  const token = await user.getIdToken();
  document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

async function ensureUserProfile(user: User, displayName?: string) {
  const ref = doc(getClientDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    email: user.email ?? "",
    displayName: displayName ?? user.displayName ?? "Student",
    role: "student",
    createdAt: serverTimestamp(),
  });
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  confirmPassword?: string,
) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim();

  const validationError = validateSignupForm({
    name: normalizedName,
    email: normalizedEmail,
    password,
    confirmPassword: confirmPassword ?? password,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const credential = await createUserWithEmailAndPassword(
    getClientAuth(),
    normalizedEmail,
    password,
  );

  await updateProfile(credential.user, { displayName: normalizedName });

  try {
    await registerUserRole(
      credential.user.uid,
      normalizedEmail,
      normalizedName,
    );
  } catch {
    await ensureUserProfile(credential.user, normalizedName);
  }

  await setSessionCookie(credential.user);
  return credential.user;
}

export async function signIn(email: string, password: string) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error("Please enter your email and password.");
  }

  const credential = await signInWithEmailAndPassword(
    getClientAuth(),
    normalizedEmail,
    password,
  );

  try {
    await ensureUserProfile(credential.user);
  } catch {
    // Login should still succeed even if profile write fails.
  }

  await setSessionCookie(credential.user);
  return credential.user;
}

export async function resetPassword(email: string) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Please enter your email address.");
  }

  await sendPasswordResetEmail(getClientAuth(), normalizedEmail);
}

export async function signOut() {
  clearSessionCookie();
  if (isFirebaseConfigured()) {
    await firebaseSignOut(getClientAuth());
  }
}
