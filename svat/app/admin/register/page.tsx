"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  listAdminMembers,
  promoteUserToAdmin,
  registerNewAdmin,
  removeAdminMember,
} from "@/lib/firebase/admin-register";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { hasAnyAdmin } from "@/lib/firestore/admins";
import type { AdminMember } from "@/lib/firestore/admins";

type Tab = "new" | "promote";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("new");
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isBootstrap, setIsBootstrap] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const firebaseReady = isFirebaseConfigured();

  const loadAdmins = useCallback(async () => {
    if (!firebaseReady) {
      setAdmins([]);
      setIsBootstrap(true);
      setLoading(false);
      return;
    }
    try {
      const [data, anyAdmin] = await Promise.all([
        listAdminMembers(),
        hasAnyAdmin(),
      ]);
      setAdmins(data);
      setIsBootstrap(!anyAdmin);
    } catch {
      setError("Failed to load admin list.");
      setIsBootstrap(true);
    } finally {
      setLoading(false);
    }
  }, [firebaseReady]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const handleRegisterNew = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const confirmPassword = form.get("confirm-password") as string;

    try {
      await registerNewAdmin(name, email, password, confirmPassword);
      setSuccess("Admin account created. Redirecting to admin login...");
      e.currentTarget.reset();
      await loadAdmins();
      setTimeout(() => router.replace("/admin/login"), 1500);
    } catch (err) {
      setError(getFirebaseErrorMessage(err, "Could not create admin account."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromote = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const identifier = form.get("identifier") as string;

    try {
      const user = await promoteUserToAdmin(identifier);
      setSuccess(`${user.displayName || user.email} is now an admin.`);
      e.currentTarget.reset();
      await loadAdmins();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not promote user to admin.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (key: string) => {
    if (!confirm("Remove this admin access?")) return;
    setError("");
    setSuccess("");
    try {
      await removeAdminMember(key);
      setSuccess("Admin access removed.");
      await loadAdmins();
    } catch (err) {
      setError(getFirebaseErrorMessage(err, "Could not remove admin."));
    }
  };

  if (loading) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav
        links={[
          { label: "Dashboard", href: "/admin" },
          { label: "Admin Register", href: "/admin/register", active: true },
        ]}
      />

      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="mx-auto max-w-4xl flex-1 px-lg py-xl">
          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-primary">
              Admin Registration
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isBootstrap
                ? "No administrators found. Create the first admin account below."
                : "Create new admin accounts or promote existing students to admin."}
            </p>
            {isBootstrap && (
              <p className="mt-sm font-body-sm text-body-sm text-secondary">
                After creating your account, sign in at{" "}
                <Link className="font-bold underline" href="/admin/login">
                  Admin Login
                </Link>
                .
              </p>
            )}
          </div>

          <div className="mb-lg flex gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-1">
            <button
              className={`flex-1 rounded-md px-md py-sm font-label-md text-label-md transition-colors ${
                tab === "new"
                  ? "bg-secondary text-white"
                  : "text-on-surface-variant hover:text-secondary"
              }`}
              onClick={() => {
                setTab("new");
                setError("");
                setSuccess("");
              }}
              type="button"
            >
              New Admin Account
            </button>
            <button
              className={`flex-1 rounded-md px-md py-sm font-label-md text-label-md transition-colors ${
                tab === "promote"
                  ? "bg-secondary text-white"
                  : "text-on-surface-variant hover:text-secondary"
              }`}
              onClick={() => {
                setTab("promote");
                setError("");
                setSuccess("");
              }}
              type="button"
            >
              Promote Existing User
            </button>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-xl">
            {tab === "new" ? (
              <form className="space-y-lg" onSubmit={handleRegisterNew}>
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                    id="name"
                    name="name"
                    placeholder="Admin name"
                    required
                    type="text"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    autoComplete="email"
                    className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                    id="email"
                    name="email"
                    placeholder="admin@example.com"
                    required
                    type="email"
                  />
                </div>

                <div className="grid gap-lg md:grid-cols-2">
                  <div className="space-y-xs">
                    <label
                      className="font-label-md text-label-md"
                      htmlFor="password"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        autoComplete="new-password"
                        className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-md pr-10 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                        id="password"
                        minLength={6}
                        name="password"
                        placeholder="At least 6 characters"
                        required
                        type={showPassword ? "text" : "password"}
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                        onClick={() => setShowPassword((v) => !v)}
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
                      className="font-label-md text-label-md"
                      htmlFor="confirm-password"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        autoComplete="new-password"
                        className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-md pr-10 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                        id="confirm-password"
                        minLength={6}
                        name="confirm-password"
                        placeholder="Re-enter password"
                        required
                        type={showConfirmPassword ? "text" : "password"}
                      />
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                        onClick={() => setShowConfirmPassword((v) => !v)}
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
                  <p className="font-body-sm text-body-sm text-error" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="font-body-sm text-body-sm text-on-tertiary-container">
                    {success}
                  </p>
                )}

                <button
                  className="font-label-md w-full rounded-lg bg-secondary py-md text-label-md text-white transition-all hover:bg-on-secondary-fixed-variant disabled:opacity-80"
                  disabled={submitting || !firebaseReady}
                  type="submit"
                >
                  {submitting ? "Creating admin..." : "Create Admin Account"}
                </button>
              </form>
            ) : (
              <form className="space-y-lg" onSubmit={handlePromote}>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Promote a student who already signed up. Enter their email or
                  Firebase UID.
                </p>

                <div className="space-y-xs">
                  <label
                    className="font-label-md text-label-md"
                    htmlFor="identifier"
                  >
                    Email or UID
                  </label>
                  <input
                    className="font-body-md w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                    id="identifier"
                    name="identifier"
                    placeholder="user@example.com or Firebase UID"
                    required
                    type="text"
                  />
                </div>

                {error && (
                  <p className="font-body-sm text-body-sm text-error" role="alert">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="font-body-sm text-body-sm text-on-tertiary-container">
                    {success}
                  </p>
                )}

                <button
                  className="font-label-md w-full rounded-lg bg-secondary py-md text-label-md text-white transition-all hover:bg-on-secondary-fixed-variant disabled:opacity-80"
                  disabled={submitting || !firebaseReady}
                  type="submit"
                >
                  {submitting ? "Promoting..." : "Promote to Admin"}
                </button>
              </form>
            )}
          </div>

          <section className="mt-xl">
            <h2 className="font-headline-md text-headline-md mb-md text-primary">
              Current Admins
            </h2>
            <div className="overflow-hidden rounded-xl border border-outline-variant">
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant bg-surface-container-low">
                  <tr>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant">
                      Name
                    </th>
                    <th className="px-lg py-md font-label-md text-label-md text-on-surface-variant">
                      Email / UID
                    </th>
                    <th className="px-lg py-md text-right font-label-md text-label-md text-on-surface-variant">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {admins.map((admin) => (
                    <tr key={admin.key} className="bg-surface-container-lowest">
                      <td className="px-lg py-md font-label-md text-label-md">
                        {admin.displayName ?? "—"}
                      </td>
                      <td className="px-lg py-md font-body-sm text-body-sm text-on-surface-variant">
                        {admin.email ?? admin.uid ?? admin.key}
                      </td>
                      <td className="px-lg py-md text-right">
                        <button
                          className="font-label-sm text-label-sm text-error hover:underline"
                          onClick={() => handleRemove(admin.key)}
                          type="button"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td
                        className="px-lg py-xl text-center font-body-sm text-on-surface-variant"
                        colSpan={3}
                      >
                        No admins registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  );
}
