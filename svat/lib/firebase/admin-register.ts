import {
  addAdminMember,
  listAdminMembers,
  promoteExistingUserToAdmin,
  registerAdminProfile,
  removeAdminMember,
} from "../firestore/admins";
import { validateSignupForm } from "../auth/validation";
import { createAuthUserWithoutSessionSwitch } from "../firebase/secondary-auth";
import {
  getClientAuth,
  isFirebaseConfigured,
  FIREBASE_SETUP_MESSAGE,
} from "../firebase/client";
import { signInWithEmailAndPassword } from "firebase/auth";

export async function registerNewAdmin(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  const validationError = validateSignupForm(
    {
      name: normalizedName,
      email: normalizedEmail,
      password,
      confirmPassword,
      accessCode: "",
    },
    { requireAccessCode: false },
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const user = await createAuthUserWithoutSessionSwitch(
    normalizedEmail,
    password,
    normalizedName,
  );

  const currentUser = getClientAuth().currentUser;
  const wasSignedIn = Boolean(currentUser);

  if (!wasSignedIn) {
    await signInWithEmailAndPassword(
      getClientAuth(),
      normalizedEmail,
      password,
    );
  }

  try {
    await addAdminMember(user.uid, normalizedEmail);
    await registerAdminProfile(user.uid, normalizedEmail, normalizedName);
  } finally {
    if (!wasSignedIn) {
      await getClientAuth().signOut();
    }
  }

  return user;
}

export async function promoteUserToAdmin(identifier: string) {
  if (!isFirebaseConfigured()) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }
  return promoteExistingUserToAdmin(identifier);
}

export { listAdminMembers, removeAdminMember };
