import "server-only";

import { isFirebaseAdminConfigured } from "@/lib/firebase/admin-config";

function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export async function repairEnrollmentWithAdminSdk(
  uid: string,
  email: string | null | undefined,
  preferredCode?: string,
): Promise<string | null> {
  if (!isFirebaseAdminConfigured()) {
    return null;
  }

  const { getAdminDb } = await import("@/lib/firebase/admin");
  const db = getAdminDb();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.data();

  const existingCode = userData?.accessCodeUsed;
  if (typeof existingCode === "string" && existingCode.trim().length > 0) {
    return existingCode;
  }

  const normalizedPreferred = preferredCode
    ? normalizeAccessCode(preferredCode)
    : "";

  if (normalizedPreferred) {
    const preferredSnap = await db.collection("accessCodes").doc(normalizedPreferred).get();
    if (preferredSnap.exists) {
      const preferredData = preferredSnap.data();
      const ownsPreferred =
        preferredData?.usedByUid === uid ||
        (email &&
          preferredData?.usedByEmail?.toLowerCase() === email.toLowerCase() &&
          preferredData?.status === "used");

      if (ownsPreferred) {
        await userRef.set(
          {
            accessCodeUsed: normalizedPreferred,
            ...(userSnap.exists
              ? {}
              : {
                  email: email ?? preferredData?.usedByEmail ?? "",
                  displayName: preferredData?.usedByDisplayName ?? "Student",
                  role: "student",
                }),
          },
          { merge: true },
        );
        return normalizedPreferred;
      }
    }
  }

  const byUid = await db
    .collection("accessCodes")
    .where("usedByUid", "==", uid)
    .limit(1)
    .get();

  if (!byUid.empty) {
    const code = byUid.docs[0].id;
    await userRef.set({ accessCodeUsed: code }, { merge: true });
    return code;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const byEmail = await db
      .collection("accessCodes")
      .where("usedByEmail", "==", normalizedEmail)
      .where("status", "==", "used")
      .limit(1)
      .get();

    if (!byEmail.empty) {
      const code = byEmail.docs[0].id;
      const codeData = byEmail.docs[0].data();
      await userRef.set(
        {
          accessCodeUsed: code,
          ...(userSnap.exists
            ? {}
            : {
                email: normalizedEmail,
                displayName: codeData.usedByDisplayName ?? "Student",
                role: "student",
              }),
        },
        { merge: true },
      );
      return code;
    }
  }

  return null;
}
