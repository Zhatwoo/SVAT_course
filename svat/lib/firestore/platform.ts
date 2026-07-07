import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getClientDb } from "../firebase/client";

const SETTINGS_COLLECTION = "settings";
const PLATFORM_DOC = "platform";

export interface PlatformSettings {
  communityDiscordUrl?: string;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await getDoc(doc(getClientDb(), SETTINGS_COLLECTION, PLATFORM_DOC));
  if (!snap.exists()) return {};
  return snap.data() as PlatformSettings;
}

export async function updateCommunityDiscordUrl(url: string) {
  await setDoc(
    doc(getClientDb(), SETTINGS_COLLECTION, PLATFORM_DOC),
    {
      communityDiscordUrl: url.trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
