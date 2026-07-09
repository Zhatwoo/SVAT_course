import { NextRequest, NextResponse } from "next/server";
import { repairEnrollmentWithAdminSdk } from "@/lib/enrollment/server-sync";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { idToken?: string; accessCode?: string };
    if (!body.idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const { verifyIdToken } = await import("@/lib/auth/verify-token");
    const decoded = await verifyIdToken(body.idToken);
    const accessCodeUsed = await repairEnrollmentWithAdminSdk(
      decoded.uid,
      decoded.email,
      body.accessCode,
    );

    if (!accessCodeUsed) {
      return NextResponse.json(
        { enrolled: false, error: "No matching access code found for this account." },
        { status: 404 },
      );
    }

    return NextResponse.json({ enrolled: true, accessCodeUsed });
  } catch (error) {
    console.error("enrollment sync error", error);
    const message = error instanceof Error ? error.message : "Enrollment sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
