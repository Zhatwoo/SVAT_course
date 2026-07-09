"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function AdminLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="material-symbols-outlined animate-spin text-secondary">
        sync
      </span>
    </div>
  );
}

const ADMIN_CHECK_TIMEOUT_MS = 8000;

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function verifyAdminAccess(force = false) {
      if (cancelled || resolvedRef.current) return;

      const firebaseUser = getClientAuth().currentUser;
      if (!firebaseUser && !force) {
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          resolvedRef.current = true;
          router.replace("/admin/login?next=/admin");
          return;
        }

        const session = (await response.json()) as { role?: string };
        if (session.role !== "admin") {
          resolvedRef.current = true;
          router.replace("/user");
          return;
        }

        if (!firebaseUser) {
          resolvedRef.current = true;
          router.replace("/admin/login?next=/admin");
          return;
        }

        resolvedRef.current = true;
        setReady(true);
      } catch {
        if (!cancelled && !resolvedRef.current) {
          resolvedRef.current = true;
          router.replace("/admin/login?next=/admin");
        }
      }
    }

    const timeout = setTimeout(() => {
      void verifyAdminAccess(true);
    }, ADMIN_CHECK_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(getClientAuth(), (firebaseUser) => {
      if (firebaseUser) {
        clearTimeout(timeout);
        void verifyAdminAccess(true);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [router]);

  if (!ready) {
    return <AdminLoadingScreen />;
  }

  return <>{children}</>;
}
