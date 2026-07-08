import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ROLE_COOKIE, SESSION_COOKIE } from "../auth/session";
import { validateLoginForm, validateSignupForm } from "../auth/validation";
import {
  getClientAuth,
  getClientDb,
  isFirebaseConfigured,
  FIREBASE_SETUP_MESSAGE,
} from "./client";
import { resolveUserRole } from "../firestore/roles";
import {
  bindAccessCodeToAccount,
  normalizeAccessCode,
  verifyAccessCode,
  verifyUserAccessCode,
} from "../firestore/accessCodes";

function expireLegacyCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Establish the server-side session. The session cookie is minted, signed, and
 * set as httpOnly by the server so the client can never forge it. We only send
 * a freshly-issued Firebase ID token for the server to verify.
 */
export async function syncSessionToServer(user: User) {
  const idToken = await user.getIdToken(false);

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to establish session");
  }
}

export async function setSessionCookie(user: User) {
  await syncSessionToServer(user);
}

export function clearSessionCookie() {
  // Session cookie is httpOnly (server-owned); only legacy client cookies here.
  expireLegacyCookie(SESSION_COOKIE);
  expireLegacyCookie(ROLE_COOKIE);
}

export async function clearServerSession() {
  clearSessionCookie();
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {
    // Ignore network errors during sign out cleanup.
  }
}

async function ensureUserProfile(
  user: User,
  displayName?: string,
  accessCodeUsed?: string,
) {
  const ref = doc(getClientDb(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    email: user.email ?? "",
    displayName: displayName ?? user.displayName ?? "Student",
    role: "student",
    ...(accessCodeUsed ? { accessCodeUsed } : {}),
    createdAt: serverTimestamp(),
  });
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  confirmPassword?: string,
  accessCode?: string,
) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim();
  const normalizedCode = normalizeAccessCode(accessCode ?? "");

  const validationError = validateSignupForm({
    name: normalizedName,
    email: normalizedEmail,
    password,
    confirmPassword: confirmPassword ?? password,
    accessCode: normalizedCode,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  await verifyAccessCode(normalizedCode, normalizedEmail);

  const credential = await createUserWithEmailAndPassword(
    getClientAuth(),
    normalizedEmail,
    password,
  );

  await updateProfile(credential.user, { displayName: normalizedName });

  try {
    await bindAccessCodeToAccount(
      normalizedCode,
      credential.user.uid,
      normalizedEmail,
      normalizedName,
    );

    await setSessionCookie(credential.user);
    return credential.user;
  } catch (error) {
    try {
      await deleteUser(credential.user);
    } catch {
      await firebaseSignOut(getClientAuth());
    }
    throw error;
  }
}

export async function signIn(
  email: string,
  password: string,
  accessCode?: string,
  options?: { requireAccessCode?: boolean },
) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const requireAccessCode = options?.requireAccessCode ?? true;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = normalizeAccessCode(accessCode ?? "");

  const validationError = validateLoginForm(
    {
      email: normalizedEmail,
      password,
      accessCode: normalizedCode,
    },
    { requireAccessCode },
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const credential = await signInWithEmailAndPassword(
    getClientAuth(),
    normalizedEmail,
    password,
  );

  try {
    const role = await resolveUserRole(credential.user.uid, credential.user.email);

    if (requireAccessCode && role !== "admin") {
      await verifyUserAccessCode(credential.user.uid, normalizedCode);
    }

    try {
      await ensureUserProfile(credential.user);
    } catch {
      // Login should still succeed even if profile write fails.
    }

    try {
      await setSessionCookie(credential.user);
    } catch {
      // Session sync failure should not block a successful Firebase login.
    }

    return credential.user;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Login failed. Please try again.";

    if (getClientAuth().currentUser) {
      await firebaseSignOut(getClientAuth());
    }
    await clearServerSession();
    throw new Error(message);
  }
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
  await clearServerSession();
  if (isFirebaseConfigured()) {
    await firebaseSignOut(getClientAuth());
  }
}
