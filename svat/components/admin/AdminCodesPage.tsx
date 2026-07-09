"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import AdminSidebar, { ADMIN_NAV_LINKS } from "@/components/admin/AdminSidebar";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { logAdminActivity } from "@/lib/firestore/activityLogs";
import {
  createAccessCode,
  createAccessCodeBatch,
  deleteAccessCode,
  listAccessCodes,
  revokeAccessCode,
} from "@/lib/firestore/accessCodes";
import type { AccessCode } from "@/lib/types";

function formatDate(value: AccessCode["createdAt"] | AccessCode["usedAt"]) {
  if (!value || typeof value !== "object" || !("toDate" in value)) return "—";
  try {
    return value.toDate().toLocaleString();
  } catch {
    return "—";
  }
}

function statusBadge(status: AccessCode["status"]) {
  if (status === "active") {
    return "bg-secondary-container text-on-secondary-container";
  }
  if (status === "used") {
    return "bg-tertiary-container text-on-tertiary-container";
  }
  return "bg-error-container text-on-error-container";
}

export default function AdminAccessCodesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [note, setNote] = useState("");
  const [assignedToEmail, setAssignedToEmail] = useState("");
  const [batchCount, setBatchCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AccessCode["status"]>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<AccessCode[]>([]);

  const firebaseReady = isFirebaseConfigured();

  const loadData = useCallback(async () => {
    if (!firebaseReady) {
      setCodes([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    try {
      const codeData = await listAccessCodes();
      setCodes(codeData);
    } catch (err) {
      setLoadError(getFirebaseErrorMessage(err, "Failed to load access codes."));
    } finally {
      setLoading(false);
    }
  }, [firebaseReady]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCodes = useMemo(() => {
    if (filter === "all") return codes;
    return codes.filter((code) => code.status === filter);
  }, [codes, filter]);

  const stats = useMemo(
    () => ({
      active: codes.filter((code) => code.status === "active").length,
      used: codes.filter((code) => code.status === "used").length,
      revoked: codes.filter((code) => code.status === "revoked").length,
    }),
    [codes],
  );

  const handleGenerateOne = async () => {
    if (!firebaseReady || generating) return;
    setGenerating(true);
    try {
      const created = await createAccessCode(note, assignedToEmail);
      await logAdminActivity({
        action: "create",
        entity: "access_code",
        entityId: created.code,
        details: {
          note: created.note ?? "",
          assignedToEmail: created.assignedToEmail ?? null,
        },
      });
      setLastGenerated([created]);
      setNote("");
      setAssignedToEmail("");
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to generate access code."));
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBatch = async () => {
    if (!firebaseReady || generating) return;
    setGenerating(true);
    try {
      const created = await createAccessCodeBatch(batchCount, note);
      for (const code of created) {
        try {
          await logAdminActivity({
            action: "create",
            entity: "access_code",
            entityId: code.code,
            details: {
              note: code.note ?? "",
              assignedToEmail: code.assignedToEmail ?? null,
              batch: true,
            },
          });
        } catch {}
      }
      setLastGenerated(created);
      setNote("");
      setAssignedToEmail("");
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to generate access codes."));
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (code: AccessCode) => {
    if (!firebaseReady) return;
    if (!confirm(`Revoke code ${code.code}?`)) return;

    try {
      await revokeAccessCode(code.code);
      await logAdminActivity({
        action: "update",
        entity: "access_code",
        entityId: code.code,
        details: { type: "revoke" },
      });
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to revoke access code."));
    }
  };

  const handleDelete = async (code: AccessCode) => {
    if (!firebaseReady) return;
    if (
      !confirm(
        `Permanently DELETE code ${code.code}?\n\nThis removes it from the list for good. This cannot be undone.`,
      )
    )
      return;

    try {
      await deleteAccessCode(code.code);
      await logAdminActivity({
        action: "delete",
        entity: "access_code",
        entityId: code.code,
        details: { previousStatus: code.status },
      });
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to delete access code."));
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      alert("Could not copy code.");
    }
  };

  if (loading) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">sync</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav mobileNavLinks={[...ADMIN_NAV_LINKS]} showNavLinks={false} />

      <div className="flex min-h-[calc(100vh-64px)]">
        <AdminSidebar />

        <main className="dashboard-main dashboard-main--admin mx-auto max-w-6xl flex-1 px-md py-lg md:px-lg md:py-xl">
          {loadError && (
            <div className="mb-lg rounded-xl border border-error-container bg-error-container px-lg py-md text-on-error-container">
              <p className="font-body-sm text-body-sm">{loadError}</p>
            </div>
          )}

          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg text-primary dark:text-on-primary">
              Generate Access Codes
            </h1>
            <p className="font-body-md text-body-md mt-xs text-on-surface-variant">
              Generate many codes and give one code to each paid student. When a
              student signs up, their account is automatically bound to that code.
            </p>
          </div>

          <section className="mb-xl rounded-xl border border-secondary/30 bg-secondary-container/20 p-lg">
            <div className="flex items-start gap-md">
              <span className="material-symbols-outlined text-secondary">info</span>
              <div>
                <h2 className="font-label-md text-label-md text-on-surface">
                  1 User = 1 Code Rule
                </h2>
                <ul className="mt-sm space-y-xs font-body-sm text-body-sm text-on-surface-variant">
                  <li>• Generate many codes — give one unique code per student.</li>
                  <li>• On signup, the code auto-binds to that account permanently.</li>
                  <li>• One code can create only one account. Cannot be reused.</li>
                  <li>• The same code is required every login for that user.</li>
                  <li>• Optional: assign a single code to a specific email.</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="mb-xl grid gap-md md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-lg">
              <p className="font-label-sm text-label-sm text-outline">Active Codes</p>
              <p className="font-headline-md text-headline-md mt-xs text-secondary">{stats.active}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-lg">
              <p className="font-label-sm text-label-sm text-outline">Used Codes</p>
              <p className="font-headline-md text-headline-md mt-xs text-primary">{stats.used}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-lg">
              <p className="font-label-sm text-label-sm text-outline">Revoked</p>
              <p className="font-headline-md text-headline-md mt-xs text-error">{stats.revoked}</p>
            </div>
          </div>

          {lastGenerated.length > 0 && (
            <section className="mb-xl rounded-xl border border-secondary bg-surface-container-low p-lg">
              <h2 className="font-headline-sm text-headline-sm mb-md text-on-surface">
                {lastGenerated.length === 1 ? "New Code Generated" : "New Codes Generated"}
              </h2>
              <div className="flex flex-wrap gap-sm">
                {lastGenerated.map((code) => (
                  <button
                    key={code.code}
                    className="flex items-center gap-sm rounded-lg border border-secondary bg-surface px-md py-sm font-label-md text-label-md text-secondary transition hover:bg-secondary-container"
                    onClick={() => void handleCopy(code.code)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                    {code.code}
                    <span className="font-label-sm text-label-sm text-outline">
                      {copiedCode === code.code ? "Copied!" : "Copy"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-sm font-body-sm text-body-sm text-on-surface-variant">
                Send this code to the student after confirming payment.
              </p>
            </section>
          )}

          <section className="mb-xl rounded-xl border border-outline-variant bg-surface-container-low p-lg">
            <h2 className="font-headline-sm text-headline-sm mb-md text-on-surface">
              Generate New Code
            </h2>
            <div className="grid gap-md md:grid-cols-2">
              <div>
                <label className="font-label-sm text-label-sm mb-xs block text-on-surface-variant">
                  Assign to Email (optional)
                </label>
                <input
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface px-md py-sm text-body-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary"
                  onChange={(e) => setAssignedToEmail(e.target.value)}
                  placeholder="student@email.com"
                  type="email"
                  value={assignedToEmail}
                />
                <p className="mt-xs font-body-sm text-body-sm text-outline">
                  For single-code generation only. Batch codes are unassigned.
                </p>
              </div>
              <div>
                <label className="font-label-sm text-label-sm mb-xs block text-on-surface-variant">
                  Payment Note (optional)
                </label>
                <input
                  className="font-body-md w-full rounded-lg border border-outline-variant bg-surface px-md py-sm text-body-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary"
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Juan - GCash March 8"
                  value={note}
                />
              </div>
            </div>

            <div className="mt-lg flex flex-wrap items-end gap-md">
              <button
                className="rounded-lg bg-secondary px-lg py-sm font-label-md text-label-md text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={generating}
                onClick={() => void handleGenerateOne()}
                type="button"
              >
                {generating ? "Generating..." : "Generate 1 Code"}
              </button>
              <div className="flex items-end gap-sm">
                <div>
                  <label className="font-label-sm text-label-sm mb-xs block text-on-surface-variant">
                    Batch Count
                  </label>
                  <input
                    className="font-body-md w-20 rounded-lg border border-outline-variant bg-surface px-md py-sm text-body-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary"
                    max={50}
                    min={1}
                    onChange={(e) => setBatchCount(Number(e.target.value) || 1)}
                    type="number"
                    value={batchCount}
                  />
                </div>
                <button
                  className="rounded-lg border border-secondary px-lg py-sm font-label-md text-label-md text-secondary transition hover:bg-secondary-container disabled:opacity-60"
                  disabled={generating}
                  onClick={() => void handleGenerateBatch()}
                  type="button"
                >
                  Generate Batch
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
            <div className="mb-md flex flex-wrap items-center justify-between gap-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">All Codes</h2>
              <div className="flex gap-sm">
                {(["all", "active", "used", "revoked"] as const).map((item) => (
                  <button
                    key={item}
                    className={`rounded-full px-md py-xs font-label-sm text-label-sm capitalize transition ${
                      filter === item
                        ? "bg-secondary text-white"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                    onClick={() => setFilter(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant font-label-sm text-label-sm text-outline">
                    <th className="px-md py-sm">Code</th>
                    <th className="px-md py-sm">Status</th>
                    <th className="px-md py-sm">Assigned Email</th>
                    <th className="px-md py-sm">Bound Account</th>
                    <th className="px-md py-sm">Note</th>
                    <th className="px-md py-sm">Created</th>
                    <th className="px-md py-sm">Used At</th>
                    <th className="px-md py-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td className="px-md py-lg font-body-sm text-body-sm text-outline" colSpan={8}>
                        No access codes yet. Generate one above.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((code) => (
                      <tr key={code.id} className="border-b border-outline-variant/60">
                        <td className="px-md py-sm font-label-md text-label-md text-on-surface">
                          {code.code}
                        </td>
                        <td className="px-md py-sm">
                          <span
                            className={`rounded-full px-sm py-xs font-label-sm text-label-sm capitalize ${statusBadge(code.status)}`}
                          >
                            {code.status}
                          </span>
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                          {code.assignedToEmail || "Any"}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                          {code.usedByEmail ? (
                            <div>
                              <p>{code.usedByDisplayName || "Student"}</p>
                              <p className="text-xs text-outline">{code.usedByEmail}</p>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                          {code.note || "—"}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                          {formatDate(code.createdAt)}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                          {formatDate(code.usedAt)}
                        </td>
                        <td className="px-md py-sm">
                          <div className="flex gap-sm">
                            <button
                              className="rounded-lg border border-outline-variant px-sm py-xs font-label-sm text-label-sm text-secondary hover:bg-surface-container"
                              onClick={() => void handleCopy(code.code)}
                              type="button"
                            >
                              {copiedCode === code.code ? "Copied" : "Copy"}
                            </button>
                            {code.status === "active" && (
                              <button
                                className="rounded-lg border border-error px-sm py-xs font-label-sm text-label-sm text-error hover:bg-error-container"
                                onClick={() => void handleRevoke(code)}
                                type="button"
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              className="rounded-lg border border-error bg-error/10 px-sm py-xs font-label-sm text-label-sm text-error hover:bg-error hover:text-white"
                              onClick={() => void handleDelete(code)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      <Footer dashboardLayout="admin" />
    </div>
  );
}
