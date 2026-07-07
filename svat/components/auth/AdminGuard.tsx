"use client";

import { RouteGuard } from "@/contexts/AuthContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard loginPath="/admin/login" requiredRole="admin">
      {children}
    </RouteGuard>
  );
}
