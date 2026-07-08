"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthSplitLayout, {
  AuthAsideChart,
  AuthAsideFootnote,
  AuthAsideHero,
  AuthInfoBanner,
  AuthMobileBrand,
  AuthPageHeader,
} from "@/components/auth/AuthSplitLayout";
import { resetPassword, signIn } from "@/lib/firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { resolveUserRole } from "@/lib/firestore/roles";

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
    const accessCode = (form.get("access-code") as string).trim().toUpperCase();

    try {
      const user = await signIn(email, password, accessCode);
      let role: "admin" | "student" = "student";
      try {
        role = await resolveUserRole(user.uid, user.email);
      } catch {
        // Default to student dashboard if role lookup fails.
      }
      router.replace(role === "admin" ? "/admin" : "/user");
      router.refresh();
    } catch (err) {
      setError(
        getFirebaseErrorMessage(
          err,
          "Invalid email, password, or access code. Please try again.",
        ),
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
    <AuthSplitLayout
      aside={
        <>
          <AuthAsideHero
            description="Access professional training modules and structured market insights built for serious traders."
            title="Master the markets."
          />
          <AuthAsideChart />
          <AuthAsideFootnote>
            Secure member access · One access code per account
          </AuthAsideFootnote>
        </>
      }
    >
      <AuthMobileBrand />
      <AuthPageHeader
        description="Sign in with your registered email, password, and access code."
        title="Welcome back"
      />

      <form className="space-y-lg" onSubmit={handleSubmit}>
        <AuthInfoBanner>
          New student? <strong>Create Account</strong> first with your access code.
          Login is for registered members only.
        </AuthInfoBanner>

        <div className="space-y-xs">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="access-code">
            Access Code
          </label>
          <div className="input-icon-group relative">
            <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              key
            </span>
            <input
              autoComplete="off"
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-md uppercase text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:bg-surface-container dark:border-outline"
              id="access-code"
              name="access-code"
              placeholder="OT-XXXXXXXX"
              required
              spellCheck={false}
              type="text"
            />
          </div>
          <p className="font-body-sm text-body-sm text-outline">
            Use the same code from your signup.
          </p>
        </div>

        <div className="space-y-xs">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="email">
            Email Address
          </label>
          <div className="input-icon-group relative">
            <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              mail
            </span>
            <input
              autoComplete="email"
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:bg-surface-container dark:border-outline"
              id="email"
              name="email"
              placeholder="you@email.com"
              required
              type="email"
            />
          </div>
        </div>

        <div className="space-y-xs">
          <div className="flex items-center justify-between">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
              Password
            </label>
            <button
              className="font-label-sm text-label-sm text-secondary transition-colors hover:text-on-secondary-fixed-variant"
              onClick={handleForgotPassword}
              type="button"
            >
              Forgot password?
            </button>
          </div>
          <div className="input-icon-group relative">
            <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              lock
            </span>
            <input
              autoComplete="current-password"
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:bg-surface-container dark:border-outline"
              id="password"
              name="password"
              placeholder="Enter your password"
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

        <div className="flex items-center">
          <input
            className="h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
            id="remember"
            type="checkbox"
          />
          <label className="ml-2 font-body-sm text-body-sm text-on-surface-variant" htmlFor="remember">
            Keep me signed in
          </label>
        </div>

        {resetSent && (
          <p className="rounded-lg border border-tertiary/30 bg-tertiary-container/20 px-md py-sm font-body-sm text-body-sm text-on-tertiary-container">
            Password reset email sent. Check your inbox.
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-error/30 bg-error-container/20 px-md py-sm font-body-sm text-body-sm text-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="font-label-md w-full rounded-xl bg-secondary py-3.5 text-label-md text-white shadow-lg shadow-secondary/20 transition-all hover:bg-on-secondary-fixed-variant active:scale-[0.99] disabled:opacity-70"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  fill="currentColor"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="mt-xl text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link
            className="font-label-sm text-label-sm font-semibold text-secondary hover:underline"
            href="/auth/signup"
          >
            Create account
          </Link>
        </p>
      </div>

      <p className="mt-lg flex items-center justify-center gap-1.5 text-center font-label-sm text-label-sm text-outline">
        <span className="material-symbols-outlined text-[16px]">verified_user</span>
        Encrypted &amp; secure member access
      </p>
    </AuthSplitLayout>
  );
}
