"use client";

import { RouteGuard } from "@/contexts/AuthContext";

export function UserGuard({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>;
}
