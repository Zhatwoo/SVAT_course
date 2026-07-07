"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import FirebaseSetupNotice from "@/components/FirebaseSetupNotice";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const firebaseReady = isFirebaseConfigured();

  return (
    <ThemeProvider>
      <AuthProvider firebaseReady={firebaseReady}>
        {!firebaseReady && <FirebaseSetupNotice />}
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
