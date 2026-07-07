import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getClientAuth, getClientDb } from "../firebase/client";
import type { AdminActivityLogAction, AdminActivityLogEntity } from "../types";

interface LogAdminActivityInput {
  action: AdminActivityLogAction;
  entity: AdminActivityLogEntity;
  entityId: string;
  details?: Record<string, unknown>;
}

export async function logAdminActivity({
  action,
  entity,
  entityId,
  details = {},
}: LogAdminActivityInput): Promise<void> {
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  await addDoc(collection(getClientDb(), "adminActivityLogs"), {
    action,
    entity,
    entityId,
    details,
    actorUid: currentUser?.uid ?? null,
    actorEmail: currentUser?.email ?? null,
    createdAt: serverTimestamp(),
  });
}
