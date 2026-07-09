import "server-only";

import { isFirebaseAdminConfigured, getAdminDb } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/types";

const ROLE_COLLECTION = "role";
const ADMIN_DOC = "admin";
const LEGACY_USER_DOC = "user";
const USERS_COLLECTION = "users";

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

function resolveRoleFromDocs(
  uid: string,
  email: string | null | undefined,
  adminData: Record<string, unknown> | undefined,
  legacyUserData: Record<string, unknown> | undefined,
  userData: Record<string, unknown> | undefined,
  userExists: boolean,
): UserRole {
  if (matchesRole(adminData, uid, email)) {
    return "admin";
  }

  if (userData?.role === "admin") {
    return "admin";
  }

  if (userExists || matchesRole(legacyUserData, uid, email)) {
    return "student";
  }

  return "student";
}

function parseFirestoreValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;

  const typed = value as Record<string, unknown>;
  if ("stringValue" in typed) return typed.stringValue;
  if ("booleanValue" in typed) return typed.booleanValue;
  if ("integerValue" in typed) return Number(typed.integerValue);
  if ("doubleValue" in typed) return typed.doubleValue;
  if ("mapValue" in typed) {
    const mapValue = typed.mapValue as { fields?: Record<string, unknown> };
    return parseFirestoreFields(mapValue.fields);
  }
  if ("arrayValue" in typed) {
    const values = (typed.arrayValue as { values?: unknown[] })?.values ?? [];
    return values.map(parseFirestoreValue);
  }

  return undefined;
}

function parseFirestoreFields(
  fields: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!fields) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const parsed = parseFirestoreValue(value);
    if (parsed !== undefined) {
      result[key] = parsed;
    }
  }
  return result;
}

async function fetchFirestoreDoc(
  projectId: string,
  docPath: string,
  idToken: string,
): Promise<Record<string, unknown> | undefined> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    },
  );

  if (response.status === 404) return undefined;
  if (!response.ok) return undefined;

  const data = (await response.json()) as { fields?: Record<string, unknown> };
  return parseFirestoreFields(data.fields);
}

async function resolveRoleViaRest(
  uid: string,
  email: string | null | undefined,
  idToken: string,
): Promise<UserRole> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return "student";
  }

  const [adminData, legacyUserData, userData] = await Promise.all([
    fetchFirestoreDoc(projectId, `${ROLE_COLLECTION}/${ADMIN_DOC}`, idToken),
    fetchFirestoreDoc(projectId, `${ROLE_COLLECTION}/${LEGACY_USER_DOC}`, idToken),
    fetchFirestoreDoc(projectId, `${USERS_COLLECTION}/${uid}`, idToken),
  ]);

  return resolveRoleFromDocs(
    uid,
    email,
    adminData,
    legacyUserData,
    userData,
    Boolean(userData),
  );
}

export async function resolveServerUserRole(
  uid: string,
  email?: string | null,
  idToken?: string,
): Promise<UserRole> {
  if (isFirebaseAdminConfigured()) {
    const db = getAdminDb();
    const [adminSnap, legacyUserSnap, userSnap] = await Promise.all([
      db.collection(ROLE_COLLECTION).doc(ADMIN_DOC).get(),
      db.collection(ROLE_COLLECTION).doc(LEGACY_USER_DOC).get(),
      db.collection(USERS_COLLECTION).doc(uid).get(),
    ]);

    return resolveRoleFromDocs(
      uid,
      email,
      adminSnap.data(),
      legacyUserSnap.data(),
      userSnap.data(),
      userSnap.exists,
    );
  }

  if (idToken) {
    return resolveRoleViaRest(uid, email, idToken);
  }

  return "student";
}
