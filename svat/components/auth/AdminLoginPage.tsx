"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { resetPassword, signIn, signOut } from "@/lib/firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { resolveUserRole } from "@/lib/firestore/roles";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | { serverConfigured?: boolean }
          | null;
        if (data && typeof data.serverConfigured === "boolean") {
          setServerConfigured(data.serverConfigured);
        }
      })
      .catch(() => {
        // Ignore — login can still be attempted.
      });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetSent(false);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim();
    const password = form.get("password") as string;

    try {
      const user = await signIn(email, password, undefined, {
        requireAccessCode: false,
      });
      let role: "admin" | "student" = "student";
      try {
        role = await resolveUserRole(user.uid, user.email);
      } catch {
        // Fall through to access denied.
      }

      if (role !== "admin") {
        await signOut();
        setError("Access denied. This account does not have administrator privileges.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        await signOut();
        const sessionData = (await sessionResponse.json().catch(() => null)) as
          | { error?: string; serverConfigured?: boolean }
          | null;
        if (sessionData?.serverConfigured === false) {
          setError(
            "Server session is not configured. Add SESSION_SECRET in Vercel environment variables, then redeploy.",
          );
        } else {
          setError(
            sessionData?.error ??
              "Login succeeded but the server session could not be created. Please try again.",
          );
        }
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        getFirebaseErrorMessage(err, "Invalid email or password. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.getElementById("admin-email") as HTMLInputElement | null;
    const email = emailInput?.value.trim();
    if (!email) {
      setError("Enter your email above, then click Forgot Password.");
      return;
    }

    setError("");
    setResetSent(false);
    setIsLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(getFirebaseErrorMessage(err, "Could not send reset email."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-split-container relative bg-surface text-on-surface">
      <div className="absolute right-4 top-4 z-50 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <aside className="left-panel">
        <div
          className="trading-pattern"
          style={{
            backgroundImage: "radial-gradient(#316bf3 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="z-10 mb-xl">
          <div className="mb-lg flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <span
                className="material-symbols-outlined text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                admin_panel_settings
              </span>
            </div>
            <span className="font-headline-md text-headline-md font-bold tracking-tight text-white">
              Admin Portal
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg mb-md leading-tight text-white">
            Manage your platform.
          </h1>
          <p className="font-body-lg text-body-lg max-w-[28rem] leading-relaxed text-on-primary-container">
            Sign in to manage courses, chapters, episodes, and administrator
            accounts for One Traders.
          </p>
        </div>

        <div className="relative z-10 mt-xl grid grid-cols-2 gap-md">
          <div className="rounded-xl border border-on-primary-fixed-variant bg-primary-container/80 p-md backdrop-blur-sm">
            <span className="material-symbols-outlined mb-sm block text-secondary-fixed">
              video_library
            </span>
            <h3 className="font-label-md text-label-md text-white">Curriculum</h3>
            <p className="font-body-sm text-body-sm text-on-primary-container/80">
              Upload and organize lessons.
            </p>
          </div>
          <div className="rounded-xl border border-on-primary-fixed-variant bg-primary-container/80 p-md backdrop-blur-sm">
            <span className="material-symbols-outlined mb-sm block text-secondary-fixed">
              group
            </span>
            <h3 className="font-label-md text-label-md text-white">Admins</h3>
            <p className="font-body-sm text-body-sm text-on-primary-container/80">
              Register and manage admins.
            </p>
          </div>
        </div>

        <div className="absolute bottom-12 left-16 z-10">
          <p className="font-body-sm text-body-sm text-on-primary-container opacity-60">
            Authorized personnel only.
          </p>
        </div>
      </aside>

      <main className="right-panel">
        <div className="w-full max-w-[400px]">
          <div className="mb-xl flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <span
                className="material-symbols-outlined text-sm text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                admin_panel_settings
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary dark:text-on-primary">
              Admin Portal
            </span>
          </div>

          <div className="mb-xl">
            <h2 className="font-headline-lg text-headline-lg mb-xs text-primary dark:text-on-primary">
              Admin Sign In
            </h2>
            <p className="font-body-md text-body-md text-outline">
              Enter your administrator credentials to access the dashboard.
            </p>
          </div>

          <form className="space-y-lg" onSubmit={handleSubmit}>
            <div className="space-y-xs">
              <label
                className="font-label-md text-label-md text-on-surface"
                htmlFor="admin-email"
              >
                Admin Email
              </label>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  mail
                </span>
                <input
                  autoComplete="email"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="admin-email"
                  name="email"
                  placeholder="admin@example.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-md text-label-md text-on-surface"
                  htmlFor="admin-password"
                >
                  Password
                </label>
                <button
                  className="font-label-sm text-label-sm text-secondary hover:underline"
                  onClick={handleForgotPassword}
                  type="button"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  lock
                </span>
                <input
                  autoComplete="current-password"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="admin-password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-primary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {resetSent && (
              <p className="font-body-sm text-body-sm text-on-tertiary-container">
                Password reset email sent. Check your inbox.
              </p>
            )}

            {!serverConfigured && (
              <p className="font-body-sm text-body-sm text-error" role="alert">
                Deployment misconfiguration: set SESSION_SECRET in Vercel project settings,
                then redeploy.
              </p>
            )}

            {error && (
              <p className="font-body-sm text-body-sm text-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="font-label-md w-full transform rounded-lg bg-secondary py-md text-label-md text-white transition-all hover:bg-on-secondary-fixed-variant active:scale-[0.98] disabled:opacity-80"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-5 w-5 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In as Admin"
              )}
            </button>
          </form>

          <div className="mt-2xl text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Student account?{" "}
              <Link
                className="ml-1 font-label-sm text-label-sm font-bold text-secondary hover:underline"
                href="/auth/login"
              >
                Student Login
              </Link>
            </p>
          </div>
        </div>

        <footer className="mt-3xl w-full max-w-[400px]">
          <div className="flex items-center justify-between border-t border-outline-variant pt-md">
            <p className="font-label-sm text-[10px] text-outline">
              © 2024 One Traders Admin
            </p>
            <Link
              className="font-label-sm text-[10px] text-outline transition-colors hover:text-secondary"
              href="/auth/login"
            >
              Back to site
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
