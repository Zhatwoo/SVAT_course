"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { setSessionCookie, signOut as firebaseSignOut } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firestore/users";
import { resolveUserRole } from "@/lib/firestore/roles";
import type { UserProfile, UserRole } from "@/lib/types";

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
  const [loading, setLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(getClientAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await setSessionCookie(firebaseUser);
        let resolvedRole: UserRole = "student";
        let userProfile: UserProfile | null = null;

        try {
          [userProfile, resolvedRole] = await Promise.all([
            getUserProfile(firebaseUser.uid),
            resolveUserRole(firebaseUser.uid, firebaseUser.email),
          ]);
        } catch {
          // Keep the session even if Firestore profile/role lookups fail.
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
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [firebaseReady]);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      loading,
      firebaseReady,
      signOut,
    }),
    [user, profile, loading, firebaseReady, signOut],
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

  useEffect(() => {
    if (loading) return;
    if (!firebaseReady) return;
    if (profile?.isBlocked) {
      void signOut();
      router.replace(loginPath);
      return;
    }
    if (!user) {
      router.replace(loginPath);
      return;
    }
    if (requiredRole && role !== requiredRole) {
      router.replace(role === "admin" ? "/admin" : "/user");
    }
  }, [user, role, loading, firebaseReady, requiredRole, router, loginPath, profile, signOut]);

  if (!firebaseReady) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  if (!user || profile?.isBlocked || (requiredRole && role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
