import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { UserProfile } from "../types";

const ROLE_COLLECTION = "role";
const ADMIN_DOC = "admin";
const USERS_COLLECTION = "users";

export interface AdminMember {
  key: string;
  uid?: string;
  email?: string;
  displayName?: string;
}

async function getAdminDocData() {
  const snap = await getDoc(doc(getClientDb(), ROLE_COLLECTION, ADMIN_DOC));
  return snap.data() ?? {};
}

function isEmailKey(key: string) {
  return key.includes("@");
}

export async function listAdminMembers(): Promise<AdminMember[]> {
  const data = await getAdminDocData();
  const members = (data.members as Record<string, boolean> | undefined) ?? {};
  const activeKeys = Object.keys(members).filter((key) => members[key] === true);

  const usersSnap = await getDocs(collection(getClientDb(), USERS_COLLECTION));
  const usersByUid = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));
  const usersByEmail = new Map(
    usersSnap.docs.map((d) => [
      (d.data().email as string | undefined)?.toLowerCase(),
      d.data(),
    ]),
  );

  const seenUids = new Set<string>();
  const results: AdminMember[] = [];

  for (const key of activeKeys) {
    const profile = isEmailKey(key)
      ? usersByEmail.get(key.toLowerCase())
      : usersByUid.get(key);

    const uid = isEmailKey(key)
      ? (profile?.uid as string | undefined) ?? usersSnap.docs.find(
          (d) =>
            (d.data().email as string | undefined)?.toLowerCase() ===
            key.toLowerCase(),
        )?.id
      : key;

    if (uid && seenUids.has(uid)) continue;
    if (uid) seenUids.add(uid);

    results.push({
      key,
      uid,
      email: isEmailKey(key)
        ? key
        : (profile?.email as string | undefined),
      displayName: profile?.displayName as string | undefined,
    });
  }

  return results;
}

export async function addAdminMember(uid: string, email: string) {
  const ref = doc(getClientDb(), ROLE_COLLECTION, ADMIN_DOC);
  const snap = await getDoc(ref);
  const existing = snap.data() ?? {};
  const members =
    existing.members && typeof existing.members === "object"
      ? { ...(existing.members as Record<string, boolean>) }
      : {};

  members[uid] = true;
  if (email.trim()) {
    members[email.trim().toLowerCase()] = true;
  }

  await setDoc(
    ref,
    {
      ...existing,
      members,
      uids: Array.from(
        new Set([...(Array.isArray(existing.uids) ? existing.uids : []), uid]),
      ),
    },
    { merge: true },
  );
}

export async function registerAdminProfile(
  uid: string,
  email: string,
  displayName: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  await setDoc(
    doc(getClientDb(), USERS_COLLECTION, uid),
    {
      uid,
      email: normalizedEmail,
      displayName: displayName.trim(),
      role: "admin",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function promoteExistingUserToAdmin(identifier: string) {
  const value = identifier.trim();
  if (!value) {
    throw new Error("Enter a user email or UID.");
  }

  const usersSnap = await getDocs(collection(getClientDb(), USERS_COLLECTION));
  let matched: UserProfile | null = null;

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const uid = docSnap.id;
    const email = (data.email as string | undefined)?.toLowerCase();

    if (uid === value || email === value.toLowerCase()) {
      matched = { uid, ...data } as UserProfile;
      break;
    }
  }

  if (!matched) {
    throw new Error("No user found with that email or UID. They must sign up first.");
  }

  await addAdminMember(matched.uid, matched.email);
  await registerAdminProfile(matched.uid, matched.email, matched.displayName);
  return matched;
}

export async function removeAdminMember(key: string) {
  const ref = doc(getClientDb(), ROLE_COLLECTION, ADMIN_DOC);
  const snap = await getDoc(ref);
  const existing = snap.data() ?? {};
  const members =
    existing.members && typeof existing.members === "object"
      ? { ...(existing.members as Record<string, boolean>) }
      : {};

  delete members[key];

  await setDoc(ref, { ...existing, members }, { merge: true });
}

export async function hasAnyAdmin(): Promise<boolean> {
  try {
    const data = await getAdminDocData();
    const members = (data.members as Record<string, boolean> | undefined) ?? {};
    return Object.values(members).some((value) => value === true);
  } catch {
    return false;
  }
}
