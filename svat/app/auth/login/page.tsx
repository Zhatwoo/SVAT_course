"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { resetPassword, signIn } from "@/lib/firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { resolveUserRole } from "@/lib/firestore/roles";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetSent(false);

    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim();
    const password = form.get("password") as string;

    try {
      const user = await signIn(email, password);
      let role: "admin" | "student" = "student";
      try {
        role = await resolveUserRole(user.uid, user.email);
      } catch {
        // Default to student dashboard if role lookup fails.
      }
      router.replace(role === "admin" ? "/admin" : "/user");
    } catch (err) {
      setError(
        getFirebaseErrorMessage(err, "Invalid email or password. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
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
                insights
              </span>
            </div>
            <span className="font-headline-md text-headline-md font-bold tracking-tight text-white">
              One Traders
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg mb-md leading-tight text-white">
            Master the markets.
          </h1>
          <p className="font-body-lg text-body-lg max-w-md text-on-primary-container">
            Access high-performance training modules and real-time market
            insights developed for professional traders. Start your journey
            today.
          </p>
        </div>

        <div className="relative z-10 mt-xl">
          <div className="rounded-xl border border-on-primary-fixed-variant bg-primary-container p-lg shadow-2xl">
            <div className="mb-md flex items-center justify-between border-b border-on-primary-fixed-variant pb-md">
              <div className="flex gap-xs">
                <div className="h-3 w-3 rounded-full bg-error" />
                <div className="h-3 w-3 rounded-full bg-secondary-container" />
                <div className="h-3 w-3 rounded-full bg-on-tertiary-container" />
              </div>
              <span className="font-label-sm text-label-sm text-on-primary-container">
                Live Market Analysis - EUR/USD
              </span>
            </div>
            <div className="flex h-48 items-end gap-2 overflow-hidden">
              <div className="h-24 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-32 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-16 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-40 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-28 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-36 w-full rounded-t-sm bg-secondary-container" />
              <div className="h-20 w-full rounded-t-sm bg-secondary-container" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-16 z-10">
          <p className="font-body-sm text-body-sm text-on-primary-container opacity-60">
            Together we reach success in every trade. Ready for your future.
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
                insights
              </span>
            </div>
            <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary dark:text-on-primary">
              One Traders
            </span>
          </div>

          <div className="mb-xl">
            <h2 className="font-headline-lg text-headline-lg mb-xs text-primary dark:text-on-primary">
              Welcome Back
            </h2>
            <p className="font-body-md text-body-md text-outline">
              Log in to continue your learning journey.
            </p>
          </div>

          <form className="space-y-lg" onSubmit={handleSubmit}>
            <div className="space-y-xs">
              <label
                className="font-label-md text-label-md text-on-surface"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  mail
                </span>
                <input
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:bg-surface-container dark:border-outline"
                  id="email"
                  name="email"
                  placeholder="example@email.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <div className="flex items-center justify-between">
                <label
                  className="font-label-md text-label-md text-on-surface"
                  htmlFor="password"
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
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:bg-surface-container dark:border-outline"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                />
                <button
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

            <div className="flex items-center">
              <input
                className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
                id="remember"
                type="checkbox"
              />
              <label
                className="ml-2 font-body-sm text-body-sm text-on-surface-variant"
                htmlFor="remember"
              >
                Remember me next time
              </label>
            </div>

            {resetSent && (
              <p className="font-body-sm text-body-sm text-on-tertiary-container">
                Password reset email sent. Check your inbox.
              </p>
            )}

            {error && (
              <p className="font-body-sm text-body-sm text-error">{error}</p>
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
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="relative mt-xl">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center text-label-sm">
              <span className="bg-surface px-md text-outline">
                Or sign in with
              </span>
            </div>
          </div>

          <div className="mt-lg grid grid-cols-2 gap-md">
            <button
              className="social-btn flex items-center justify-center gap-2 rounded-lg py-md font-label-md text-label-md text-on-surface"
              type="button"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
            <button
              className="social-btn flex items-center justify-center gap-2 rounded-lg py-md font-label-md text-label-md text-on-surface"
              type="button"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C3.39 16.03 2.94 8.7 6.36 6.84c1.72-.94 3.52-.3 4.54.34 1.05.66 1.83.66 2.95 0 1.02-.59 2.9-.84 4.19.46 1.17.65 2.27 2.1 2.27 2.1s-2.52 3.34-1.26 8.54c.01 0 .01.01.01.01a11.143 11.143 0 01-2.01 2.16zM12.03 5.48c-.23-2.61 2.3-4.8 4.74-4.71.24 2.72-2.48 5.17-4.74 4.71z" />
              </svg>
              Apple
            </button>
          </div>

          <div className="mt-2xl text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Don&apos;t have an account yet?{" "}
              <Link
                className="ml-1 font-label-sm text-label-sm font-bold text-secondary hover:underline"
                href="/auth/signup"
              >
                Create an Account
              </Link>
            </p>
            <p className="mt-md font-body-sm text-body-sm text-on-surface-variant">
              Administrator?{" "}
              <Link
                className="ml-1 font-label-sm text-label-sm font-bold text-secondary hover:underline"
                href="/admin/login"
              >
                Admin Login
              </Link>
            </p>
          </div>
        </div>

        <footer className="mt-3xl w-full max-w-[400px]">
          <div className="flex items-center justify-between border-t border-outline-variant pt-md">
            <p className="font-label-sm text-[10px] text-outline">
              © 2024 One Traders
            </p>
            <div className="flex gap-md">
              <a
                className="font-label-sm text-[10px] text-outline transition-colors hover:text-secondary"
                href="#"
              >
                Privacy
              </a>
              <a
                className="font-label-sm text-[10px] text-outline transition-colors hover:text-secondary"
                href="#"
              >
                Terms
              </a>
              <a
                className="font-label-sm text-[10px] text-outline transition-colors hover:text-secondary"
                href="#"
              >
                Help Center
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
