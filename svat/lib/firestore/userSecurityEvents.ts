import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "../firebase/client";
import type { UserSecurityEvent, UserSecurityEventType } from "../types";

interface LogUserSecurityEventInput {
  eventType: UserSecurityEventType;
  userId: string;
  userEmail?: string;
  episodeId?: string;
  courseId?: string;
  context?: Record<string, unknown>;
}

export async function logUserSecurityEvent(input: LogUserSecurityEventInput) {
  const auth = getClientAuth();
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== input.userId) return;

  await addDoc(collection(getClientDb(), "userSecurityEvents"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function getRecentSecurityEvents(max = 100): Promise<UserSecurityEvent[]> {
  const q = query(
    collection(getClientDb(), "userSecurityEvents"),
    orderBy("createdAt", "desc"),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserSecurityEvent);
}
