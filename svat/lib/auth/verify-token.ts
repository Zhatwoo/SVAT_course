import "server-only";

import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

export interface VerifiedToken {
  uid: string;
  email?: string | null;
}

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export function isFirebaseProjectConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  );
}

function resolveProjectId(idToken: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (fromEnv) return fromEnv;

  const payload = decodeJwt(idToken);
  const aud = payload.aud;
  if (typeof aud === "string" && aud.trim()) return aud;
  if (Array.isArray(aud) && typeof aud[0] === "string" && aud[0].trim()) {
    return aud[0];
  }

  throw new Error("Missing Firebase project ID");
}

/**
 * Verify a Firebase ID token using Google's public signing keys.
 * Works on Vercel/serverless without Firebase Admin SDK or API-key REST calls.
 */
async function verifyIdTokenViaJwt(idToken: string): Promise<VerifiedToken> {
  const projectId = resolveProjectId(idToken);
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    clockTolerance: 60,
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
