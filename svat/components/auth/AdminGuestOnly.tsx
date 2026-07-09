"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function AuthGateLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-on-surface">
      <span className="material-symbols-outlined animate-spin text-3xl text-secondary">
        sync
      </span>
      <p className="text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

const CHECK_TIMEOUT_MS = 5000;

/** Redirect logged-in admins away from the admin login page. */
export function AdminGuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession(force = false) {
      if (cancelled || resolvedRef.current) return;

      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.ok) {
          const session = (await response.json()) as { role?: string };
          if (session.role === "admin") {
            resolvedRef.current = true;
            setRedirecting(true);
            router.replace("/admin");
            return;
          }
        }

        if (!force) return;
        resolvedRef.current = true;
        setReady(true);
      } catch {
        if (!cancelled && !resolvedRef.current) {
          resolvedRef.current = true;
          setReady(true);
        }
      }
    }

    const timeout = setTimeout(() => {
      void checkSession(true);
    }, CHECK_TIMEOUT_MS);

    void checkSession(false);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [router]);

  if (redirecting) {
    return <AuthGateLoading label="Redirecting to admin dashboard..." />;
  }

  if (!ready) {
    return <AuthGateLoading />;
  }

  return <>{children}</>;
}
