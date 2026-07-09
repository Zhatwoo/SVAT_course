// Repair a student's enrollment by signing in as an ADMIN account.
// Admins can write any user profile per the Firestore rules, so this
// bypasses the fragile student-side write path entirely.
//
// Usage (run from the `svat` folder):
//   node scripts/repair-student-as-admin.mjs <adminEmail> <adminPassword> <studentEmail> [accessCode]
//
// It signs in as the admin, finds the student's profile + access code,
// sets users/<studentUid>.accessCodeUsed, and reports the result.

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
  const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const normalizeCode = (c) => (c ?? "").trim().toUpperCase().replace(/\s+/g, "");

async function main() {
  const [adminEmail, adminPassword, studentEmail, accessCodeArg] = process.argv.slice(2);
  if (!adminEmail || !adminPassword || !studentEmail) {
    console.error(
      "Usage: node scripts/repair-student-as-admin.mjs <adminEmail> <adminPassword> <studentEmail> [accessCode]",
    );
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
  const studentLower = studentEmail.trim().toLowerCase();

  console.log("Project:", env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("Signing in as ADMIN:", adminEmail);
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log("Admin signed in OK.");
  console.log("--------------------------------------------------");

  // Confirm admin can list users (proves admin rights + rules).
  console.log("Listing users to locate student:", studentLower);
  const usersSnap = await getDocs(collection(db, "users"));
  console.log("Total user docs readable:", usersSnap.size);

  let studentUid = null;
  let studentProfile = null;
  usersSnap.forEach((d) => {
    const data = d.data();
    if ((data.email || "").toLowerCase() === studentLower) {
      studentUid = d.id;
      studentProfile = data;
    }
  });

  if (!studentUid) {
    console.log("!! No users doc found with email", studentLower);
    console.log(">>> The student's profile document does not exist. They may need to sign up again,");
    console.log(">>> or the profile was created under a different email.");
    console.log("Available emails:");
    usersSnap.forEach((d) => console.log("  -", d.id, "=>", d.data().email));
    process.exit(0);
  }

  console.log("Found student UID:", studentUid);
  console.log("Current profile:", JSON.stringify(studentProfile, null, 2));
  console.log("Current accessCodeUsed:", JSON.stringify(studentProfile.accessCodeUsed));
  console.log("--------------------------------------------------");

  // Find the access code linked to this student.
  let code = accessCodeArg ? normalizeCode(accessCodeArg) : null;
  const codesSnap = await getDocs(collection(db, "accessCodes"));
  console.log("Total accessCodes readable:", codesSnap.size);

  if (!code) {
    codesSnap.forEach((d) => {
      const data = d.data();
      const byUid = data.usedByUid === studentUid;
      const byEmail = (data.usedByEmail || "").toLowerCase() === studentLower;
      if (byUid || byEmail) {
        code = d.id;
        console.log("Matched access code:", d.id, "(byUid:", byUid, "byEmail:", byEmail, ")");
        console.log(JSON.stringify(data, null, 2));
      }
    });
  }

  if (!code) {
    console.log("!! No access code found linked to this student.");
    console.log("All access codes:");
    codesSnap.forEach((d) => {
      const x = d.data();
      console.log("  -", d.id, "| status:", x.status, "| usedByUid:", x.usedByUid, "| usedByEmail:", x.usedByEmail);
    });
    console.log(">>> Using placeholder 'ENROLLED' so the student can access content.");
    code = "ENROLLED";
  }
  console.log("--------------------------------------------------");

  // Write accessCodeUsed as admin (rules allow admin to update any user).
  console.log("Writing users/" + studentUid + ".accessCodeUsed =", code);
  await setDoc(doc(db, "users", studentUid), { accessCodeUsed: code }, { merge: true });
  console.log("WRITE SUCCESS.");

  const verify = await getDoc(doc(db, "users", studentUid));
  console.log("Verified accessCodeUsed:", JSON.stringify(verify.data().accessCodeUsed));
  console.log("==================================================");
  console.log("DONE. Tell the student to refresh their dashboard.");
  process.exit(0);
}

main().catch((err) => {
  console.error("FATAL:", err.code || err.message);
  process.exit(1);
});
