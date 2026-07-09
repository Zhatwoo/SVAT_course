import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { getClientAuth, getClientDb } from "../firebase/client";
import { getUserProfile } from "./users";
import type { AccessCode, AccessCodeStatus } from "../types";

const COLLECTION = "accessCodes";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_HINT_KEY = "svat_last_access_code";

export function saveStudentAccessCodeHint(code: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeAccessCode(code);
  if (normalized) {
    localStorage.setItem(ACCESS_CODE_HINT_KEY, normalized);
  }
}

export function readStudentAccessCodeHint(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const value = localStorage.getItem(ACCESS_CODE_HINT_KEY);
  return value ? normalizeAccessCode(value) : undefined;
}

function hasValidEnrollmentCode(code?: string | null): code is string {
  return typeof code === "string" && code.trim().length > 0;
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function generateAccessCodeValue(): string {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `OT-${suffix}`;
}

export async function verifyAccessCode(
  code: string,
  email?: string,
): Promise<AccessCode> {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    throw new Error("Please enter your access code.");
  }

  const snap = await getDoc(doc(getClientDb(), COLLECTION, normalized));
  if (!snap.exists()) {
    throw new Error("Invalid access code. Please check the code from your admin.");
  }

  const data = snap.data() as Omit<AccessCode, "id">;
  if (data.status !== "active") {
    throw new Error(
      data.status === "used"
        ? "This access code has already been used."
        : "This access code is no longer valid.",
    );
  }

  if (data.assignedToEmail && email) {
    const assigned = data.assignedToEmail.trim().toLowerCase();
    const signupEmail = email.trim().toLowerCase();
    if (assigned !== signupEmail) {
      throw new Error("This access code is assigned to a different email.");
    }
  }

  return { id: snap.id, ...data };
}

async function writeStudentEnrollment(
  uid: string,
  code: string,
  profile: Awaited<ReturnType<typeof getUserProfile>>,
  codeData?: Partial<AccessCode>,
): Promise<void> {
  const authUser = getClientAuth().currentUser;
  const userRef = doc(getClientDb(), "users", uid);

  if (!profile) {
    await setDoc(userRef, {
      email: authUser?.email ?? codeData?.usedByEmail ?? "",
      displayName: authUser?.displayName ?? codeData?.usedByDisplayName ?? "Student",
      role: "student",
      accessCodeUsed: code,
      createdAt: serverTimestamp(),
    });
    return;
  }

  if (!hasValidEnrollmentCode(profile.accessCodeUsed)) {
    await setDoc(userRef, { accessCodeUsed: code }, { merge: true });
  }
}

function studentOwnsAccessCode(
  uid: string,
  codeData: Omit<AccessCode, "id">,
  authEmail?: string,
): boolean {
  if (codeData.usedByUid === uid) {
    return true;
  }

  const codeEmail = codeData.usedByEmail?.trim().toLowerCase();
  return Boolean(
    authEmail &&
      codeEmail &&
      codeEmail === authEmail &&
      codeData.status === "used",
  );
}

async function tryLinkFromCodeDoc(
  uid: string,
  code: string,
  profile: Awaited<ReturnType<typeof getUserProfile>>,
): Promise<string | null> {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    return null;
  }

  const authEmail = getClientAuth().currentUser?.email?.trim().toLowerCase();
  const codeSnap = await getDoc(doc(getClientDb(), COLLECTION, normalized));
  if (!codeSnap.exists()) {
    return null;
  }

  const codeData = codeSnap.data() as Omit<AccessCode, "id">;
  if (!studentOwnsAccessCode(uid, codeData, authEmail)) {
    return null;
  }

  await writeStudentEnrollment(uid, normalized, profile, codeData);
  return normalized;
}

export async function verifyUserAccessCode(uid: string, code: string): Promise<void> {
  const normalized = normalizeAccessCode(code);
  let profile: Awaited<ReturnType<typeof getUserProfile>> = null;

  try {
    profile = await getUserProfile(uid);
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      throw new Error(
        "Cannot read your account profile. Deploy firestore.rules in Firebase Console, then try again.",
      );
    }
    throw error;
  }

  if (profile?.accessCodeUsed === normalized) {
    return;
  }

  let codeSnap;
  try {
    codeSnap = await getDoc(doc(getClientDb(), COLLECTION, normalized));
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      throw new Error(
        "Cannot verify access code. Deploy firestore.rules in Firebase Console, then try again.",
      );
    }
    throw error;
  }

  if (codeSnap.exists()) {
    const codeData = codeSnap.data() as Omit<AccessCode, "id">;
    const authEmail = getClientAuth().currentUser?.email?.trim().toLowerCase();

    if (studentOwnsAccessCode(uid, codeData, authEmail)) {
      await writeStudentEnrollment(uid, normalized, profile, codeData);
      return;
    }

    if (codeData.status === "active") {
      throw new Error(
        "This access code is not linked to your account yet. Please sign up first using Create Account.",
      );
    }

    if (codeData.status === "used") {
      throw new Error("This access code belongs to a different account.");
    }

    throw new Error("This access code is no longer valid.");
  }

  if (!profile?.accessCodeUsed) {
    throw new Error(
      "No access code is linked to this account. Sign up with a code or contact admin.",
    );
  }

  if (profile.accessCodeUsed !== normalized) {
    throw new Error("Invalid access code for this account.");
  }
}

/** Link accessCodeUsed on the student profile when the code doc already references this uid. */
export async function repairStudentEnrollment(
  uid: string,
  preferredCode?: string,
): Promise<string | null> {
  const authUser = getClientAuth().currentUser;
  if (authUser) {
    try {
      const idToken = await authUser.getIdToken();
      const response = await fetch("/api/enrollment/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          accessCode: preferredCode ?? readStudentAccessCodeHint(),
        }),
        credentials: "same-origin",
      });

      if (response.ok) {
        const data = (await response.json()) as { accessCodeUsed?: string };
        if (hasValidEnrollmentCode(data.accessCodeUsed)) {
          return data.accessCodeUsed;
        }
      }
    } catch {
      // Fall back to client-side Firestore repair.
    }
  }

  return syncStudentEnrollment(uid, preferredCode);
}

export async function syncStudentEnrollment(
  uid: string,
  preferredCode?: string,
): Promise<string | null> {
  const profile = await getUserProfile(uid);
  if (hasValidEnrollmentCode(profile?.accessCodeUsed)) {
    return profile.accessCodeUsed;
  }

  const hint = preferredCode ?? readStudentAccessCodeHint();
  if (hint) {
    try {
      const linked = await tryLinkFromCodeDoc(uid, hint, profile);
      if (linked) {
        return linked;
      }
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "permission-denied") {
        throw error;
      }
    }
  }

  const byUid = await getDocs(
    query(
      collection(getClientDb(), COLLECTION),
      where("usedByUid", "==", uid),
      limit(1),
    ),
  );

  if (!byUid.empty) {
    const codeDoc = byUid.docs[0];
    const code = codeDoc.id;
    await writeStudentEnrollment(
      uid,
      code,
      profile,
      codeDoc.data() as Omit<AccessCode, "id">,
    );
    return code;
  }

  const authEmail = getClientAuth().currentUser?.email?.trim().toLowerCase();
  if (authEmail) {
    const byEmail = await getDocs(
      query(
        collection(getClientDb(), COLLECTION),
        where("usedByEmail", "==", authEmail),
        limit(1),
      ),
    );

    if (!byEmail.empty) {
      const codeDoc = byEmail.docs[0];
      const codeData = codeDoc.data() as Omit<AccessCode, "id">;
      if (codeData.status === "used") {
        const code = codeDoc.id;
        await writeStudentEnrollment(uid, code, profile, codeData);
        return code;
      }
    }
  }

  return null;
}

export async function bindAccessCodeToAccount(
  code: string,
  uid: string,
  email: string,
  displayName: string,
): Promise<void> {
  const normalized = normalizeAccessCode(code);
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = displayName.trim() || "Student";
  const codeRef = doc(getClientDb(), COLLECTION, normalized);
  const userRef = doc(getClientDb(), "users", uid);

  await runTransaction(getClientDb(), async (transaction) => {
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists()) {
      throw new Error("Invalid access code.");
    }

    const codeData = codeSnap.data() as Omit<AccessCode, "id">;
    if (codeData.status !== "active") {
      throw new Error("This access code has already been used or revoked.");
    }

    if (codeData.usedByUid) {
      throw new Error("This access code is already bound to another account.");
    }

    if (codeData.assignedToEmail) {
      const assigned = codeData.assignedToEmail.trim().toLowerCase();
      if (assigned !== normalizedEmail) {
        throw new Error("This access code is assigned to a different email.");
      }
    }

    transaction.update(codeRef, {
      status: "used" satisfies AccessCodeStatus,
      usedByUid: uid,
      usedByEmail: normalizedEmail,
      usedByDisplayName: normalizedName,
      usedAt: serverTimestamp(),
    });

    transaction.set(
      userRef,
      {
        uid,
        email: normalizedEmail,
        displayName: normalizedName,
        role: "student",
        accessCodeUsed: normalized,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function redeemAccessCode(
  code: string,
  uid: string,
  email: string,
): Promise<void> {
  const normalized = normalizeAccessCode(code);
  const codeRef = doc(getClientDb(), COLLECTION, normalized);

  await runTransaction(getClientDb(), async (transaction) => {
    const snap = await transaction.get(codeRef);
    if (!snap.exists()) {
      throw new Error("Invalid access code.");
    }

    const data = snap.data() as Omit<AccessCode, "id">;
    if (data.status !== "active") {
      throw new Error("This access code has already been used or revoked.");
    }

    if (data.usedByUid) {
      throw new Error("This access code has already been used by another user.");
    }

    if (data.assignedToEmail) {
      const assigned = data.assignedToEmail.trim().toLowerCase();
      const userEmail = email.trim().toLowerCase();
      if (assigned !== userEmail) {
        throw new Error("This access code is assigned to a different email.");
      }
    }

    transaction.update(codeRef, {
      status: "used" satisfies AccessCodeStatus,
      usedByUid: uid,
      usedByEmail: email.trim().toLowerCase(),
      usedAt: serverTimestamp(),
    });
  });
}

export async function createAccessCode(
  note?: string,
  assignedToEmail?: string,
): Promise<AccessCode> {
  const auth = getClientAuth();
  const code = generateAccessCodeValue();
  const normalizedAssignee = assignedToEmail?.trim().toLowerCase() || null;

  const payload = {
    code,
    status: "active" as const,
    note: note?.trim() || "",
    assignedToEmail: normalizedAssignee,
    createdByUid: auth.currentUser?.uid ?? null,
    createdByEmail: auth.currentUser?.email ?? null,
    createdAt: serverTimestamp(),
    usedByUid: null,
    usedByEmail: null,
    usedAt: null,
  };

  await setDoc(doc(getClientDb(), COLLECTION, code), payload);

  return {
    id: code,
    ...payload,
    createdAt: payload.createdAt as AccessCode["createdAt"],
    usedAt: null,
  };
}

export async function createAccessCodeBatch(
  count: number,
  note?: string,
): Promise<AccessCode[]> {
  const safeCount = Math.min(Math.max(count, 1), 50);
  const created: AccessCode[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    created.push(await createAccessCode(note));
  }

  return created;
}

export async function listAccessCodes(): Promise<AccessCode[]> {
  const snap = await getDocs(
    query(collection(getClientDb(), COLLECTION), orderBy("createdAt", "desc")),
  );

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<AccessCode, "id">),
  }));
}

export async function revokeAccessCode(code: string): Promise<void> {
  const normalized = normalizeAccessCode(code);
  const codeRef = doc(getClientDb(), COLLECTION, normalized);
  const snap = await getDoc(codeRef);

  if (!snap.exists()) {
    throw new Error("Access code not found.");
  }

  const data = snap.data() as Omit<AccessCode, "id">;
  if (data.status === "used") {
    throw new Error("Cannot revoke a code that has already been used.");
  }

  await updateDoc(codeRef, {
    status: "revoked" satisfies AccessCodeStatus,
  });
}

/** Permanently delete an access code document. Works for any status. */
export async function deleteAccessCode(code: string): Promise<void> {
  const normalized = normalizeAccessCode(code);
  await deleteDoc(doc(getClientDb(), COLLECTION, normalized));
}
