"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import AuthSplitLayout, {
  AuthAsideFeatures,
  AuthAsideFootnote,
  AuthAsideHero,
  AuthInfoBanner,
  AuthMobileBrand,
  AuthPageHeader,
} from "@/components/auth/AuthSplitLayout";
import { parseSignupForm, validateSignupForm } from "@/lib/auth/validation";
import { signUp } from "@/lib/firebase/auth";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";

const FEATURES = [
  {
    icon: "school",
    title: "Full Curriculum",
    description: "Structured lessons from beginner to advanced.",
  },
  {
    icon: "trending_up",
    title: "Track Progress",
    description: "Complete episodes and unlock the next lessons.",
  },
  {
    icon: "shield",
    title: "Secure Access",
    description: "One access code per account after payment.",
  },
] as const;

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
        formData.accessCode,
      );
      router.refresh();
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
    <AuthSplitLayout
      aside={
        <>
          <AuthAsideHero
            description="Join professional training for forex, crypto, indices, and metals. Learn step by step at your own pace."
            title="Start your trading journey."
          />
          <AuthAsideFeatures items={FEATURES} />
          <AuthAsideFootnote>Together we reach success in every trade.</AuthAsideFootnote>
        </>
      }
    >
      <AuthMobileBrand />
      <AuthPageHeader
        description="Register with your access code to verify enrollment and unlock your account."
        title="Create your account"
      />

      <form className="space-y-lg" onSubmit={handleSubmit}>
        <AuthInfoBanner>
          Your access code is provided by admin after payment. Each code can only
          be used for <strong>one account</strong>.
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
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-md uppercase text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:border-outline dark:bg-surface-container"
              id="access-code"
              name="access-code"
              placeholder="OT-XXXXXXXX"
              required
              spellCheck={false}
              type="text"
            />
          </div>
        </div>

        <div className="space-y-xs">
          <label className="font-label-md text-label-md text-on-surface" htmlFor="name">
            Full Name
          </label>
          <div className="input-icon-group relative">
            <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
              person
            </span>
            <input
              autoComplete="name"
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:border-outline dark:bg-surface-container"
              id="name"
              name="name"
              placeholder="John Smith"
              required
              type="text"
            />
          </div>
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
              className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-md text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:border-outline dark:bg-surface-container"
              id="email"
              name="email"
              placeholder="you@email.com"
              required
              type="email"
            />
          </div>
        </div>

        <div className="grid gap-lg sm:grid-cols-2">
          <div className="space-y-xs">
            <label className="font-label-md text-label-md text-on-surface" htmlFor="password">
              Password
            </label>
            <div className="input-icon-group relative">
              <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                lock
              </span>
              <input
                autoComplete="new-password"
                className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:border-outline dark:bg-surface-container"
                id="password"
                minLength={6}
                name="password"
                placeholder="Min. 6 characters"
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
            <label className="font-label-md text-label-md text-on-surface" htmlFor="confirm-password">
              Confirm Password
            </label>
            <div className="input-icon-group relative">
              <span className="input-icon material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                lock_reset
              </span>
              <input
                autoComplete="new-password"
                className="font-body-md w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-10 pr-10 text-body-md text-on-surface outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/30 dark:border-outline dark:bg-surface-container"
                id="confirm-password"
                minLength={6}
                name="confirm-password"
                placeholder="Re-enter password"
                required
                type={showConfirmPassword ? "text" : "password"}
              />
              <button
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
        </div>

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
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="mt-xl text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link
            className="font-label-sm text-label-sm font-semibold text-secondary hover:underline"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-lg text-center font-label-sm text-label-sm leading-relaxed text-outline">
        By creating an account, you agree to our{" "}
        <Link className="text-secondary hover:underline" href="/terms">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link className="text-secondary hover:underline" href="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
    </AuthSplitLayout>
  );
}
