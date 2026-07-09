import { NextRequest, NextResponse } from "next/server";
import { resolveServerUserRole } from "@/lib/auth/server-role";
import {
  ROLE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  isSessionSecretConfigured,
  signSession,
} from "@/lib/auth/session";
import { verifyIdToken } from "@/lib/auth/verify-token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

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

    // Real signature verification (Admin SDK or Google REST). Throws on forgery.
    const decoded = await verifyIdToken(body.idToken);

    let role: "admin" | "student" = "student";
    try {
      role = await resolveServerUserRole(decoded.uid, decoded.email, body.idToken);
    } catch {
      // Default to student when role lookup is unavailable.
    }

    const sessionValue = await signSession({
      uid: decoded.uid,
      role,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set(SESSION_COOKIE, sessionValue, COOKIE_OPTIONS);
    // Clear any legacy plaintext role cookie from older builds.
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
