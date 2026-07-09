"use client";

import { useCallback, useEffect, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import AdminSidebar, { ADMIN_NAV_LINKS } from "@/components/admin/AdminSidebar";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import { logAdminActivity } from "@/lib/firestore/activityLogs";
import {
  getAllUsers,
  setUserBlocked,
  updateUserProfile,
} from "@/lib/firestore/users";
import { getRecentSecurityEvents } from "@/lib/firestore/userSecurityEvents";
import type { UserProfile, UserRole, UserSecurityEvent } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [securityEvents, setSecurityEvents] = useState<UserSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("student");
  const [blockReasonInput, setBlockReasonInput] = useState("");

  const firebaseReady = isFirebaseConfigured();

  const loadData = useCallback(async () => {
    if (!firebaseReady) {
      setUsers([]);
      setSecurityEvents([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    try {
      const [userData, eventData] = await Promise.all([
        getAllUsers(),
        getRecentSecurityEvents(200),
      ]);
      setUsers(userData);
      setSecurityEvents(eventData);
    } catch (err) {
      setLoadError(
        getFirebaseErrorMessage(err, "Failed to load users/security records."),
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseReady]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const startEditUser = (userRecord: UserProfile) => {
    setEditingUserId(userRecord.uid);
    setEditDisplayName(userRecord.displayName ?? "");
    setEditRole(userRecord.role ?? "student");
    setBlockReasonInput(userRecord.blockedReason ?? "");
  };

  const handleSaveUser = async (uid: string) => {
    if (!firebaseReady) return;
    try {
      await updateUserProfile(uid, {
        displayName: editDisplayName.trim() || "Student",
        role: editRole,
        blockedReason: blockReasonInput.trim(),
      });
      try {
        await logAdminActivity({
          action: "update",
          entity: "user",
          entityId: `users/${uid}`,
          details: {
            type: "user_profile_update",
            displayName: editDisplayName.trim() || "Student",
            role: editRole,
            blockedReason: blockReasonInput.trim(),
          },
        });
      } catch {}
      setEditingUserId(null);
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to update user profile."));
    }
  };

  const handleToggleBlockUser = async (userRecord: UserProfile) => {
    if (!firebaseReady) return;
    const nextBlocked = !Boolean(userRecord.isBlocked);
    const reason = nextBlocked
      ? blockReasonInput.trim() || userRecord.blockedReason || "Blocked by admin"
      : "";
    try {
      await setUserBlocked(userRecord.uid, nextBlocked, reason);
      try {
        await logAdminActivity({
          action: "update",
          entity: "user",
          entityId: `users/${userRecord.uid}`,
          details: {
            type: "user_block_toggle",
            isBlocked: nextBlocked,
            reason,
          },
        });
      } catch {}
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to update block status."));
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
              <h1 className="font-headline-lg text-headline-lg text-primary">
                User Management & Leak Records
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                View users, block/edit accounts, and inspect screenshot/screen-record suspicious events.
              </p>
            </div>

            <section className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="mb-sm font-label-md text-label-md">User Management</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">User</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">Role</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">Access Code</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">Status</th>
                      <th className="px-md py-sm font-label-md text-label-md text-on-surface-variant">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {users.map((userRecord) => {
                      const isEditing = editingUserId === userRecord.uid;
                      return (
                        <tr key={userRecord.uid}>
                          <td className="px-md py-sm">
                            {isEditing ? (
                              <div className="space-y-xs">
                                <input
                                  className="w-full rounded border border-outline-variant bg-surface px-sm py-1 text-body-sm"
                                  onChange={(e) => setEditDisplayName(e.target.value)}
                                  value={editDisplayName}
                                />
                                <p className="text-xs text-on-surface-variant">{userRecord.email}</p>
                              </div>
                            ) : (
                              <div>
                                <p className="font-label-md text-label-md">{userRecord.displayName}</p>
                                <p className="text-xs text-on-surface-variant">{userRecord.email}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-md py-sm">
                            {isEditing ? (
                              <select
                                className="rounded border border-outline-variant bg-surface px-sm py-1 text-body-sm"
                                onChange={(e) => setEditRole(e.target.value as UserRole)}
                                value={editRole}
                              >
                                <option value="student">student</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className="capitalize">{userRecord.role}</span>
                            )}
                          </td>
                          <td className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">
                            {userRecord.accessCodeUsed || "—"}
                          </td>
                          <td className="px-md py-sm">
                            <span
                              className={`rounded px-sm py-0.5 text-xs ${
                                userRecord.isBlocked
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                              }`}
                            >
                              {userRecord.isBlocked ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td className="px-md py-sm">
                            <div className="flex flex-wrap gap-sm">
                              {isEditing ? (
                                <>
                                  <input
                                    className="rounded border border-outline-variant bg-surface px-sm py-1 text-body-sm"
                                    onChange={(e) => setBlockReasonInput(e.target.value)}
                                    placeholder="Block reason (optional)"
                                    value={blockReasonInput}
                                  />
                                  <button
                                    className="rounded bg-secondary px-sm py-1 text-xs text-on-secondary"
                                    onClick={() => void handleSaveUser(userRecord.uid)}
                                    type="button"
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="rounded border border-outline-variant px-sm py-1 text-xs"
                                    onClick={() => setEditingUserId(null)}
                                    type="button"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="rounded border border-outline-variant px-sm py-1 text-xs"
                                    onClick={() => startEditUser(userRecord)}
                                    type="button"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className={`rounded px-sm py-1 text-xs ${
                                      userRecord.isBlocked
                                        ? "bg-tertiary-container text-on-tertiary-container"
                                        : "bg-error text-on-error"
                                    }`}
                                    onClick={() => void handleToggleBlockUser(userRecord)}
                                    type="button"
                                  >
                                    {userRecord.isBlocked ? "Unblock" : "Block"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="mb-sm font-label-md text-label-md">Leak / Security Records</h3>
              <div className="max-h-80 overflow-auto rounded border border-outline-variant">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-surface-container-low">
                    <tr>
                      <th className="px-md py-sm text-xs uppercase text-on-surface-variant">Time</th>
                      <th className="px-md py-sm text-xs uppercase text-on-surface-variant">User</th>
                      <th className="px-md py-sm text-xs uppercase text-on-surface-variant">Event</th>
                      <th className="px-md py-sm text-xs uppercase text-on-surface-variant">Episode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {securityEvents.length === 0 ? (
                      <tr>
                        <td className="px-md py-md text-sm text-on-surface-variant" colSpan={4}>
                          No leak/security records yet.
                        </td>
                      </tr>
                    ) : (
                      securityEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="px-md py-sm text-xs text-on-surface-variant">
                            {event.createdAt?.toDate ? event.createdAt.toDate().toLocaleString() : "—"}
                          </td>
                          <td className="px-md py-sm text-sm">{event.userEmail ?? event.userId}</td>
                          <td className="px-md py-sm text-sm capitalize">
                            {event.eventType.replaceAll("_", " ")}
                          </td>
                          <td className="px-md py-sm text-xs text-on-surface-variant">
                            {event.episodeId ?? "—"}
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
