import { FirebaseError } from "firebase/app";

const AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/user-not-found": "No account found with this email. Sign up first.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password. Please try again.",
  "auth/email-already-in-use": "This email is already registered. Try logging in.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/operation-not-allowed":
    "Email/password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and that localhost is in Firebase authorized domains.",
  "auth/missing-password": "Please enter your password.",
};

export function getFirebaseErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    return AUTH_MESSAGES[error.code] ?? error.message ?? fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
