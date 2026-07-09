import { NextRequest, NextResponse } from "next/server";
import { isFirebaseProjectConfigured } from "@/lib/auth/verify-token";
import {
  ROLE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  isSessionSecretConfigured,
  signSession,
  verifySession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function GET(request: NextRequest) {
  try {
    const serverConfigured = isSessionSecretConfigured();
    const firebaseProjectConfigured = isFirebaseProjectConfigured();
    const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json(
        { authenticated: false, serverConfigured, firebaseProjectConfigured },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      serverConfigured,
      firebaseProjectConfigured,
      uid: session.uid,
      role: session.role,
    });
  } catch (error) {
    console.error("session GET error", error);
    return NextResponse.json(
      { authenticated: false, error: "Session check failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { idToken?: string };
    if (!body.idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    if (!isSessionSecretConfigured()) {
      return NextResponse.json(
        { error: "Server misconfigured: set SESSION_SECRET in Vercel environment variables." },
        { status: 503 },
      );
    }

    const { verifyIdToken } = await import("@/lib/auth/verify-token");
    let decoded;
    try {
      decoded = await verifyIdToken(body.idToken);
    } catch (error) {
      console.error("session POST verify error", error);
      const detail =
        error instanceof Error ? error.message : "Unknown verification error";
      return NextResponse.json(
        { error: `Could not verify login token: ${detail}` },
        { status: 401 },
      );
    }

    let role: "admin" | "student" = "student";
    try {
      const { resolveServerUserRole } = await import("@/lib/auth/server-role");
      role = await resolveServerUserRole(decoded.uid, decoded.email, body.idToken);
    } catch {
      // Default to student when role lookup is unavailable.
    }

    let sessionValue: string;
    try {
      sessionValue = await signSession({
        uid: decoded.uid,
        role,
        exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      });
    } catch (error) {
      console.error("session POST sign error", error);
      return NextResponse.json(
        { error: "Could not sign session. Check SESSION_SECRET on Vercel." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(SESSION_COOKIE, sessionValue, COOKIE_OPTIONS);
    response.cookies.set(ROLE_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
    return response;
  } catch (error) {
    console.error("session POST error", error);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(ROLE_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
