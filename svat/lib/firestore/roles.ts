import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { UserRole } from "../types";

const ROLE_COLLECTION = "role";
const ADMIN_DOC = "admin";
const USERS_COLLECTION = "users";

/** Legacy single-doc registry (role/user). Kept for backward compatibility only. */
const LEGACY_USER_DOC = "user";

function collectIdentifiers(data: Record<string, unknown> | undefined): Set<string> {
  const ids = new Set<string>();
  if (!data) return ids;

  for (const key of ["members", "uids", "emails", "admin", "user"] as const) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      ids.add(value.trim().toLowerCase());
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim()) {
          ids.add(item.trim().toLowerCase());
        }
      }
      continue;
    }
    if (value && typeof value === "object") {
      for (const mapKey of Object.keys(value as Record<string, unknown>)) {
        if (mapKey.trim()) ids.add(mapKey.trim().toLowerCase());
      }
    }
  }

  return ids;
}

function matchesRole(
  data: Record<string, unknown> | undefined,
  uid: string,
  email?: string | null,
) {
  const ids = collectIdentifiers(data);
  if (ids.has(uid.toLowerCase())) return true;
  if (email && ids.has(email.trim().toLowerCase())) return true;
  return false;
}

export async function resolveUserRole(
  uid: string,
  email?: string | null,
): Promise<UserRole> {
  try {
    const db = getClientDb();
    const [adminSnap, legacyUserSnap, userSnap] = await Promise.all([
      getDoc(doc(db, ROLE_COLLECTION, ADMIN_DOC)),
      getDoc(doc(db, ROLE_COLLECTION, LEGACY_USER_DOC)),
      getDoc(doc(db, USERS_COLLECTION, uid)),
    ]);

    if (matchesRole(adminSnap.data(), uid, email)) {
      return "admin";
    }

    const userData = userSnap.data();
    if (userData?.role === "admin") {
      return "admin";
    }

    if (userSnap.exists() || matchesRole(legacyUserSnap.data(), uid, email)) {
      return "student";
    }
  } catch {
    // Fall back to student if role documents are missing or rules block reads.
  }

  return "student";
}

/** Save each student as their own document in the users collection. */
export async function registerUserRole(
  uid: string,
  email: string,
  displayName?: string,
  accessCodeUsed?: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const name = displayName?.trim() || "Student";

  await setDoc(
    doc(getClientDb(), USERS_COLLECTION, uid),
    {
      uid,
      email: normalizedEmail,
      displayName: name,
      role: "student" as const,
      ...(accessCodeUsed ? { accessCodeUsed } : {}),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function listAllUsers() {
  const snap = await getDocs(collection(getClientDb(), USERS_COLLECTION));
  return snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  }));
}
