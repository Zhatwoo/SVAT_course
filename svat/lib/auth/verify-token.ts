import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

export interface VerifiedToken {
  uid: string;
  email?: string | null;
}

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

function getFirebaseProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }
  return projectId;
}

/**
 * Verify a Firebase ID token using Google's public signing keys.
 * Works on Vercel/serverless without Firebase Admin SDK or API-key REST calls.
 */
async function verifyIdTokenViaJwt(idToken: string): Promise<VerifiedToken> {
  const projectId = getFirebaseProjectId();
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) {
    throw new Error("Invalid idToken");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

export async function verifyIdToken(idToken: string): Promise<VerifiedToken> {
  const { isFirebaseAdminConfigured, getAdminAuth } = await import("@/lib/firebase/admin");
  if (isFirebaseAdminConfigured()) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
      };
    } catch {
      // Misconfigured Admin SDK on the host should not block login.
    }
  }

  return verifyIdTokenViaJwt(idToken);
}
