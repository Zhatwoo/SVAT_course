"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirect logged-in admins away from the admin login page. */
export function AdminGuestOnly({ children }: { children: React.ReactNode }) {
  const { user, role, loading, firebaseReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseReady || loading || !user) return;
    if (role === "admin") {
      router.replace("/admin");
    }
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

  if (user && role === "admin") {
    return null;
  }

  return <>{children}</>;
}
