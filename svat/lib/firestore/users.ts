import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { UserProfile } from "../types";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getClientDb(), "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getClientDb(), "users"));
  return snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  })) as UserProfile[];
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "role" | "isBlocked" | "blockedReason">>,
) {
  await setDoc(
    doc(getClientDb(), "users", uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function setUserBlocked(
  uid: string,
  blocked: boolean,
  reason?: string,
) {
  await updateDoc(doc(getClientDb(), "users", uid), {
    isBlocked: blocked,
    blockedReason: blocked ? reason ?? "Blocked by admin" : "",
    updatedAt: serverTimestamp(),
  });
}
