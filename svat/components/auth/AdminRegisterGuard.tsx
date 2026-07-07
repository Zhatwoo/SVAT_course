"use client";

import { useAuth } from "@/contexts/AuthContext";
import { hasAnyAdmin } from "@/lib/firestore/admins";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Allows access when:
 * - No admins exist yet (first-time bootstrap), or
 * - The signed-in user is an admin.
 */
export function AdminRegisterGuard({ children }: { children: React.ReactNode }) {
  const { user, role, loading, firebaseReady } = useAuth();
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<boolean | null>(null);

  useEffect(() => {
    if (!firebaseReady) {
      setBootstrap(true);
      return;
    }
    hasAnyAdmin()
      .then((exists) => setBootstrap(!exists))
      .catch(() => setBootstrap(true));
  }, [firebaseReady]);

  useEffect(() => {
    if (loading || bootstrap === null) return;
    if (!firebaseReady) return;

    if (bootstrap) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    if (role !== "admin") {
      router.replace("/admin/login");
    }
  }, [user, role, loading, firebaseReady, bootstrap, router]);

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (loading || bootstrap === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  if (!bootstrap && (!user || role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}
