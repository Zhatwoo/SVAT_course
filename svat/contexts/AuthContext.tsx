"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  clearServerSession,
  setSessionCookie,
  signOut as firebaseSignOut,
} from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firestore/users";
import {
  readStudentAccessCodeHint,
  repairStudentEnrollment,
} from "@/lib/firestore/accessCodes";
import { resolveUserRole } from "@/lib/firestore/roles";
import type { UserProfile, UserRole } from "@/lib/types";

const AUTH_PROFILE_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

function getLiveFirebaseUser(): User | null {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  return getClientAuth().currentUser;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  firebaseReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  firebaseReady = isFirebaseConfigured(),
}: {
  children: React.ReactNode;
  firebaseReady?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(firebaseReady);
  const initialAuthCheckRef = useRef(true);

  useEffect(() => {
    if (!firebaseReady) return;

    let cancelled = false;

    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { role?: UserRole } | null) => {
        if (!cancelled && (data?.role === "admin" || data?.role === "student")) {
          setSessionRole(data.role);
        }
      })
      .catch(() => {
        // Session lookup is best-effort; Firebase auth remains the source of truth.
      });

    return () => {
      cancelled = true;
    };
  }, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getClientAuth(), async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(true);

        try {
          let resolvedRole: UserRole = "student";
          let userProfile: UserProfile | null = null;

          try {
            [userProfile, resolvedRole] = await withTimeout(
              Promise.all([
                getUserProfile(firebaseUser.uid),
                resolveUserRole(firebaseUser.uid, firebaseUser.email),
              ]),
              AUTH_PROFILE_TIMEOUT_MS,
              [null, "student" as UserRole],
            );
          } catch {
            // Keep the session even if Firestore profile/role lookups fail.
          }

          if (resolvedRole === "student" && !userProfile?.accessCodeUsed?.trim()) {
            try {
              const syncedCode = await repairStudentEnrollment(
                firebaseUser.uid,
                readStudentAccessCodeHint(),
              );
              if (syncedCode) {
                userProfile = userProfile
                  ? { ...userProfile, accessCodeUsed: syncedCode }
                  : {
                      uid: firebaseUser.uid,
                      email: firebaseUser.email ?? "",
                      displayName: firebaseUser.displayName ?? "Student",
                      role: "student",
                      accessCodeUsed: syncedCode,
                      createdAt: {} as UserProfile["createdAt"],
                    };
              } else {
                const refreshed = await getUserProfile(firebaseUser.uid);
                if (refreshed?.accessCodeUsed) {
                  userProfile = refreshed;
                }
              }
            } catch {
              // Enrollment sync is best-effort.
            }
          }

          setProfile(
            userProfile
              ? { ...userProfile, role: resolvedRole }
              : {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email ?? "",
                  displayName: firebaseUser.displayName ?? "Student",
                  role: resolvedRole,
                  createdAt: {} as UserProfile["createdAt"],
                },
          );

          void setSessionCookie(firebaseUser);
        } finally {
          setLoading(false);
          initialAuthCheckRef.current = false;
        }
        return;
      }

      setUser(null);
      setProfile(null);

      const shouldClearSession =
        !initialAuthCheckRef.current && !getLiveFirebaseUser();

      if (shouldClearSession) {
        setSessionRole(null);
        await clearServerSession();
      }

      setLoading(false);
      initialAuthCheckRef.current = false;
    });

    return unsubscribe;
  }, [firebaseReady]);

  const signOut = useCallback(async () => {
    initialAuthCheckRef.current = false;
    await firebaseSignOut();
    setUser(null);
    setProfile(null);
    setSessionRole(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role:
        sessionRole === "admin"
          ? "admin"
          : (profile?.role ?? sessionRole ?? null),
      loading,
      firebaseReady,
      signOut,
    }),
    [user, profile, sessionRole, loading, firebaseReady, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="material-symbols-outlined animate-spin text-secondary">
        sync
      </span>
    </div>
  );
}

export function RouteGuard({
  children,
  requiredRole,
  loginPath = "/auth/login",
}: {
  children: React.ReactNode;
  requiredRole?: UserRole;
  loginPath?: string;
}) {
  const { user, role, profile, loading, firebaseReady, signOut } = useAuth();
  const router = useRouter();
  const liveUser = firebaseReady ? getLiveFirebaseUser() : null;
  const effectiveUser = user ?? liveUser;
  const isSyncing = Boolean(liveUser && !user);
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    if (!isSyncing) {
      setSyncTimedOut(false);
      return;
    }

    const timer = setTimeout(() => setSyncTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, [isSyncing]);

  useEffect(() => {
    if (!loading && !isSyncing) {
      setAuthTimedOut(false);
      return;
    }

    const timer = setTimeout(() => setAuthTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [loading, isSyncing]);

  const isWaitingForAuth = (loading || (isSyncing && !syncTimedOut)) && !authTimedOut;

  useEffect(() => {
    if (isWaitingForAuth) return;
    if (!firebaseReady) return;
    if (profile?.isBlocked) {
      void signOut();
      router.replace(loginPath);
      return;
    }
    if (!effectiveUser) {
      router.replace(loginPath);
      return;
    }
    if (requiredRole && role === null) {
      return;
    }
    if (requiredRole && role !== requiredRole) {
      router.replace(role === "admin" ? "/admin" : "/user");
    }
  }, [
    effectiveUser,
    role,
    isWaitingForAuth,
    firebaseReady,
    requiredRole,
    router,
    loginPath,
    profile,
    signOut,
    authTimedOut,
  ]);

  useEffect(() => {
    if (!authTimedOut) return;
    if (!effectiveUser) {
      router.replace(loginPath);
    }
  }, [authTimedOut, effectiveUser, loginPath, router]);

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (isWaitingForAuth) {
    return <AuthLoadingScreen />;
  }

  if (!effectiveUser) {
    return <AuthLoadingScreen />;
  }

  if (profile?.isBlocked) {
    return <AuthLoadingScreen />;
  }

  if (requiredRole && role === null) {
    return <AuthLoadingScreen />;
  }

  if (requiredRole && role !== requiredRole) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
