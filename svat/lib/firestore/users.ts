import { collection, doc, getDoc, getDocs } from "firebase/firestore";
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
