// Diagnose + repair a student's enrollment (accessCodeUsed) issue.
//
// Usage (run from the `svat` folder):
//   node scripts/diagnose-enrollment.mjs <email> <password> [accessCode]
//
// It signs in as the given student (client SDK, so Firestore rules apply),
// prints exactly what is in their profile + access code, then tries to repair
// the `accessCodeUsed` field and read the courses collection.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  limit,
} from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function normalizeCode(code) {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

async function main() {
  const [email, password, accessCodeArg] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: node scripts/diagnose-enrollment.mjs <email> <password> [accessCode]");
    process.exit(1);
  }

  const env = loadEnv();
  const app = initializeApp({
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("Project:", env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("Signing in as:", email);

  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  console.log("Signed in. UID:", uid);
  console.log("Auth email:", cred.user.email);
  console.log("--------------------------------------------------");

  // 1. Read the user profile.
  let profile = null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      profile = snap.data();
      console.log("users/" + uid + " EXISTS:");
      console.log(JSON.stringify(profile, null, 2));
    } else {
      console.log("users/" + uid + " DOES NOT EXIST (no profile document).");
    }
  } catch (err) {
    console.log("ERROR reading users/" + uid + ":", err.code || err.message);
  }
  console.log("--------------------------------------------------");

  const currentCode = profile?.accessCodeUsed;
  const hasValid = typeof currentCode === "string" && currentCode.trim().length > 0;
  console.log("accessCodeUsed on profile:", JSON.stringify(currentCode));
  console.log("Is enrolled (valid accessCodeUsed):", hasValid);
  console.log("isBlocked:", profile?.isBlocked);
  console.log("--------------------------------------------------");

  // 2. Find the access code linked to this account.
  let linkedCode = accessCodeArg ? normalizeCode(accessCodeArg) : null;

  if (linkedCode) {
    try {
      const snap = await getDoc(doc(db, "accessCodes", linkedCode));
      if (snap.exists()) {
        console.log("accessCodes/" + linkedCode + ":");
        console.log(JSON.stringify(snap.data(), null, 2));
      } else {
        console.log("accessCodes/" + linkedCode + " does not exist.");
        linkedCode = null;
      }
    } catch (err) {
      console.log("ERROR reading accessCodes/" + linkedCode + ":", err.code || err.message);
    }
  }

  if (!linkedCode) {
    console.log("Searching accessCodes where usedByUid == " + uid + " ...");
    try {
      const byUid = await getDocs(
        query(collection(db, "accessCodes"), where("usedByUid", "==", uid), limit(1)),
      );
      if (!byUid.empty) {
        linkedCode = byUid.docs[0].id;
        console.log("Found by usedByUid:", linkedCode);
        console.log(JSON.stringify(byUid.docs[0].data(), null, 2));
      } else {
        console.log("None found by usedByUid.");
      }
    } catch (err) {
      console.log("ERROR querying by usedByUid:", err.code || err.message);
    }
  }

  if (!linkedCode) {
    const lowerEmail = (cred.user.email || "").toLowerCase();
    console.log("Searching accessCodes where usedByEmail == " + lowerEmail + " ...");
    try {
      const byEmail = await getDocs(
        query(collection(db, "accessCodes"), where("usedByEmail", "==", lowerEmail), limit(1)),
      );
      if (!byEmail.empty) {
        linkedCode = byEmail.docs[0].id;
        console.log("Found by usedByEmail:", linkedCode);
        console.log(JSON.stringify(byEmail.docs[0].data(), null, 2));
      } else {
        console.log("None found by usedByEmail.");
      }
    } catch (err) {
      console.log("ERROR querying by usedByEmail:", err.code || err.message);
    }
  }
  console.log("--------------------------------------------------");

  // 3. Repair: write accessCodeUsed if we found a code and it's missing.
  const codeToWrite = hasValid ? currentCode : linkedCode;
  if (!hasValid && codeToWrite) {
    console.log("Attempting to REPAIR: set users/" + uid + ".accessCodeUsed =", codeToWrite);
    try {
      if (profile) {
        await setDoc(doc(db, "users", uid), { accessCodeUsed: codeToWrite }, { merge: true });
      } else {
        await setDoc(doc(db, "users", uid), {
          email: cred.user.email || "",
          displayName: cred.user.displayName || "Student",
          role: "student",
          accessCodeUsed: codeToWrite,
        });
      }
      console.log("REPAIR SUCCESS. accessCodeUsed is now:", codeToWrite);
    } catch (err) {
      console.log("REPAIR FAILED:", err.code || err.message);
      console.log(">>> This means your published Firestore RULES do not allow the write.");
      console.log(">>> Re-publish the latest svat/firestore.rules in Firebase Console.");
    }
  } else if (!codeToWrite) {
    console.log("No access code is linked to this account at all.");
    console.log(">>> This student never redeemed a code, OR the code doc has no usedByUid/usedByEmail.");
    console.log(">>> Fix: in Firestore, open the correct accessCodes doc and set usedByUid =", uid);
    console.log(">>> Or set users/" + uid + ".accessCodeUsed manually to the code string.");
  }
  console.log("--------------------------------------------------");

  // 4. Try to read courses (this is what the dashboard does).
  console.log("Trying to read the courses collection (as this student)...");
  try {
    const coursesSnap = await getDocs(collection(db, "courses"));
    console.log("SUCCESS. Courses readable. Count:", coursesSnap.size);
    coursesSnap.forEach((d) => {
      const data = d.data();
      console.log("  -", d.id, "| title:", data.title, "| isPublished:", data.isPublished);
    });
    if (coursesSnap.size === 0) {
      console.log(">>> Rules OK but there are NO course documents yet.");
    }
  } catch (err) {
    console.log("COURSES READ FAILED:", err.code || err.message);
    if ((err.code || "").includes("permission-denied")) {
      console.log(">>> Still permission-denied => isEnrolled() is false at rules time.");
      console.log(">>> Either accessCodeUsed still not set, or rules not published, or wrong project.");
    }
  }

  console.log("==================================================");
  console.log("DONE. Copy ALL of the output above and send it back.");
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err.code || err.message);
  process.exit(1);
});
