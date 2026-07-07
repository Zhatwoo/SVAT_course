"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { parseSignupForm, validateSignupForm } from "@/lib/auth/validation";
import { signUp } from "@/lib/firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = parseSignupForm(new FormData(e.currentTarget));
    const validationError = validateSignupForm(formData);
    if (validationError) {
      setError(validationError);
      setIsLoading(false);
      return;
    }

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.confirmPassword,
      );
      router.replace("/user");
    } catch (err) {
      setError(
        getFirebaseErrorMessage(
          err,
          "Could not create account. Please try again.",
        ),
      );
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
            Start your trading journey.
          </h1>
          <p className="font-body-lg text-body-lg max-w-md text-on-primary-container">
            Join professional training modules built for forex, crypto, indices,
            and metals. Learn step by step at your own pace.
          </p>
        </div>

        <div className="relative z-10 mt-xl grid grid-cols-2 gap-md">
          <div className="rounded-xl border border-on-primary-fixed-variant bg-primary-container/80 p-md backdrop-blur-sm">
            <span className="material-symbols-outlined mb-sm block text-secondary-fixed">
              school
            </span>
            <h3 className="font-label-md text-label-md text-white">
              Full Curriculum
            </h3>
            <p className="font-body-sm text-body-sm text-on-primary-container/80">
              Structured lessons from beginner to advanced.
            </p>
          </div>
          <div className="rounded-xl border border-on-primary-fixed-variant bg-primary-container/80 p-md backdrop-blur-sm">
            <span className="material-symbols-outlined mb-sm block text-secondary-fixed">
              trending_up
            </span>
            <h3 className="font-label-md text-label-md text-white">
              Live Progress
            </h3>
            <p className="font-body-sm text-body-sm text-on-primary-container/80">
              Track completion and unlock lessons as you go.
            </p>
          </div>
        </div>

        <div className="absolute bottom-12 left-16 z-10">
          <p className="font-body-sm text-body-sm text-on-primary-container opacity-60">
            Together we reach success in every trade.
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
              Create Account
            </h2>
            <p className="font-body-md text-body-md text-outline">
              Sign up with your email to access courses and track your progress.
            </p>
          </div>

          <form className="space-y-lg" onSubmit={handleSubmit}>
            <div className="space-y-xs">
              <label
                className="font-label-md text-label-md text-on-surface"
                htmlFor="name"
              >
                Full Name
              </label>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  person
                </span>
                <input
                  autoComplete="name"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="name"
                  name="name"
                  placeholder="John Smith"
                  required
                  type="text"
                />
              </div>
            </div>

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
                  autoComplete="email"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="email"
                  name="email"
                  placeholder="example@email.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <label
                className="font-label-md text-label-md text-on-surface"
                htmlFor="password"
              >
                Password
              </label>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  lock
                </span>
                <input
                  autoComplete="new-password"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="password"
                  minLength={6}
                  name="password"
                  placeholder="At least 6 characters"
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

            <div className="space-y-xs">
              <label
                className="font-label-md text-label-md text-on-surface"
                htmlFor="confirm-password"
              >
                Confirm Password
              </label>
              <div className="input-icon-group relative">
                <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  lock_reset
                </span>
                <input
                  autoComplete="new-password"
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                  id="confirm-password"
                  minLength={6}
                  name="confirm-password"
                  placeholder="Re-enter password"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                />
                <button
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors hover:text-primary"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

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
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-2xl text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link
                className="ml-1 font-label-sm text-label-sm font-bold text-secondary hover:underline"
                href="/auth/login"
              >
                Log in
              </Link>
            </p>
          </div>

          <p className="mt-lg text-center font-label-sm text-label-sm text-outline">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </p>
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
                Help
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
