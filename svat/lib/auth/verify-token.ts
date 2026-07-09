import "server-only";

import {
  createLocalJWKSet,
  decodeJwt,
  jwtVerify,
  type JSONWebKeySet,
  type JWTVerifyGetKey,
} from "jose";

export interface VerifiedToken {
  uid: string;
  email?: string | null;
}

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwksGetter: JWTVerifyGetKey | null = null;
let jwksLoadedAt = 0;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getFirebaseJwks(): Promise<JWTVerifyGetKey> {
  const now = Date.now();
  if (jwksGetter && now - jwksLoadedAt < JWKS_TTL_MS) {
    return jwksGetter;
  }

  const response = await fetch(JWKS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`JWKS fetch failed (${response.status})`);
  }

  const json = (await response.json()) as JSONWebKeySet;
  jwksGetter = createLocalJWKSet(json);
  jwksLoadedAt = now;
  return jwksGetter;
}

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

function audienceMatches(
  aud: string | string[] | undefined,
  projectId: string,
): boolean {
  if (!aud) return false;
  if (typeof aud === "string") return aud === projectId;
  return aud.includes(projectId);
}

/**
 * Verify a Firebase ID token using Google's public signing keys.
 * Works on Vercel/serverless without Firebase Admin SDK or API-key REST calls.
 */
async function verifyIdTokenViaJwt(idToken: string): Promise<VerifiedToken> {
  const projectId = resolveProjectId(idToken);
  const jwks = await getFirebaseJwks();
  const { payload } = await jwtVerify(idToken, jwks, {
    clockTolerance: 120,
  });

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Invalid token issuer`);
  }

  if (!audienceMatches(payload.aud, projectId)) {
    throw new Error(`Invalid token audience`);
  }

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
