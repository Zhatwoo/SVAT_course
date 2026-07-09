import "server-only";

import { isFirebaseAdminConfigured, getAdminAuth } from "@/lib/firebase/admin";

export interface VerifiedToken {
  uid: string;
  email?: string | null;
}

/**
 * Verify a Firebase ID token against Google's servers. There is intentionally
 * NO offline/decode-only fallback: an unverifiable token must fail closed so a
 * forged JWT can never be accepted.
 */
async function verifyIdTokenViaRest(idToken: string): Promise<VerifiedToken> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Invalid idToken");
  }

  const data = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string }>;
  };

  const user = data.users?.[0];
  if (!user?.localId) {
    throw new Error("Invalid idToken");
  }

  return {
    uid: user.localId,
    email: user.email ?? null,
  };
}

export async function verifyIdToken(idToken: string): Promise<VerifiedToken> {
  if (isFirebaseAdminConfigured()) {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  }

  return verifyIdTokenViaRest(idToken);
}
