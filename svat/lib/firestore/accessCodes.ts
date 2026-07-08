import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "../firebase/client";
import { getUserProfile } from "./users";
import type { AccessCode, AccessCodeStatus } from "../types";

const COLLECTION = "accessCodes";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

export async function verifyUserAccessCode(uid: string, code: string): Promise<void> {
  const normalized = normalizeAccessCode(code);
  const profile = await getUserProfile(uid);

  if (profile?.accessCodeUsed === normalized) {
    return;
  }

  const codeRef = doc(getClientDb(), COLLECTION, normalized);
  const codeSnap = await getDoc(codeRef);

  if (codeSnap.exists()) {
    const codeData = codeSnap.data() as Omit<AccessCode, "id">;

    if (codeData.usedByUid === uid) {
      if (!profile?.accessCodeUsed) {
        await updateDoc(doc(getClientDb(), "users", uid), {
          accessCodeUsed: normalized,
        });
      }
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
