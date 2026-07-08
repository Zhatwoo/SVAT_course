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

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export async function logUserSecurityEvent(input: LogUserSecurityEventInput) {
  const auth = getClientAuth();
  await auth.authStateReady();
  const currentUid = auth.currentUser?.uid;
  if (!currentUid || currentUid !== input.userId) {
    throw new Error("Cannot log security event: user is not authenticated.");
  }

  const payload = omitUndefined({
    eventType: input.eventType,
    userId: input.userId,
    userEmail: input.userEmail,
    episodeId: input.episodeId,
    courseId: input.courseId,
    context: input.context,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(getClientDb(), "userSecurityEvents"), payload);
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
