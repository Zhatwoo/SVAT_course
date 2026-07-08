import type { UserRole } from "@/lib/types";

export const SESSION_COOKIE = "__session";
export const ROLE_COOKIE = "__role";

/** Lifetime of a signed session cookie (7 days). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Payload embedded in the server-signed session cookie. The signature (HMAC)
 * guarantees the client cannot tamper with `uid`, `role`, or `exp`.
 */
export interface SignedSession {
  uid: string;
  role: UserRole;
  exp: number; // milliseconds since epoch
}

/**
 * Secret used to sign session cookies. Prefer a dedicated SESSION_SECRET, then
 * fall back to the already-secret Admin private key. The final dev-only
 * constant keeps local setups working but is NOT safe for production — set
 * SESSION_SECRET in any real deployment.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "svat-dev-insecure-session-secret";
  }
  return "";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Copy into a fresh ArrayBuffer so the bytes satisfy the BufferSource type. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function encodeUtf8(value: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(value));
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encodeUtf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Create a tamper-proof session value: base64url(payload).base64url(hmac). */
export async function signSession(payload: SignedSession): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("Missing SESSION_SECRET for session signing");
  }

  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(body));

  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Verify signature + expiry and return the payload, or null when invalid. */
export async function verifySession(
  value: string | undefined,
): Promise<SignedSession | null> {
  if (!value) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      toArrayBuffer(fromBase64Url(signature)),
      encodeUtf8(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    ) as SignedSession;

    if (!payload?.uid) return null;
    if (payload.role !== "admin" && payload.role !== "student") return null;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function parseUserRole(value: string | undefined): UserRole | null {
  if (value === "admin" || value === "student") return value;
  return null;
}

export const AUTH_LOGIN_PATH = "/auth/login";
export const ADMIN_LOGIN_PATH = "/admin/login";

export const PUBLIC_PATHS = new Set([
  AUTH_LOGIN_PATH,
  "/auth/signup",
  ADMIN_LOGIN_PATH,
  "/admin/register",
  "/auth/admin/login",
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return (
    pathname.startsWith("/auth/login/") ||
    pathname.startsWith("/auth/signup/") ||
    pathname.startsWith("/admin/login/") ||
    pathname.startsWith("/admin/register/")
  );
}

export function isUserPath(pathname: string): boolean {
  return pathname === "/user" || pathname.startsWith("/user/");
}

export function isAdminPath(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(`${ADMIN_LOGIN_PATH}/`)) {
    return false;
  }
  if (pathname === "/admin/register" || pathname.startsWith("/admin/register/")) {
    return false;
  }
  return true;
}

export function isGuestAuthPath(pathname: string): boolean {
  return (
    pathname === AUTH_LOGIN_PATH ||
    pathname.startsWith("/auth/login/") ||
    pathname === "/auth/signup" ||
    pathname.startsWith("/auth/signup/") ||
    pathname === ADMIN_LOGIN_PATH ||
    pathname.startsWith("/admin/login/")
  );
}
