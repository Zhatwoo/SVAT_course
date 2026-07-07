import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length);
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { episodeId?: string };
    if (!body.episodeId) {
      return NextResponse.json({ error: "episodeId is required" }, { status: 400 });
    }

    const episodeSnap = await getAdminDb().collection("episodes").doc(body.episodeId).get();
    if (!episodeSnap.exists()) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const secureVideoPath = episodeSnap.data().secureVideoPath as string | undefined;
    if (!secureVideoPath) {
      return NextResponse.json({ error: "No secure video configured" }, { status: 404 });
    }

    const [signedUrl] = await getAdminStorage()
      .bucket()
      .file(secureVideoPath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 5,
      });

    return NextResponse.json({
      url: signedUrl,
      expiresInSeconds: 300,
    });
  } catch (error) {
    console.error("secure-video-url error", error);
    return NextResponse.json(
      { error: "Failed to generate secure video url" },
      { status: 500 },
    );
  }
}
