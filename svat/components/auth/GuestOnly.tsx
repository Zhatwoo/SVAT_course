"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, role, loading, firebaseReady } = useAuth();
  const router = useRouter();
  const liveUser =
    typeof window !== "undefined" && firebaseReady && isFirebaseConfigured()
      ? getClientAuth().currentUser
      : null;
  const effectiveUser = user ?? liveUser;
  const isSyncing = Boolean(liveUser && !user);

  useEffect(() => {
    if (!firebaseReady || loading || isSyncing || !effectiveUser) return;
    router.replace(role === "admin" ? "/admin" : "/user");
  }, [effectiveUser, role, loading, isSyncing, firebaseReady, router]);

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (loading || isSyncing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  if (effectiveUser) {
    return null;
  }

  return <>{children}</>;
}
