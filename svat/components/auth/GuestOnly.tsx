"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, role, loading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseReady || loading || !user) return;
    router.replace(role === "admin" ? "/admin" : "/user");
  }, [user, role, loading, firebaseReady, router]);

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}
