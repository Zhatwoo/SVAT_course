import { AdminGuard } from "@/components/auth/AdminGuard";

export default function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminGuard>{children}</AdminGuard>;
}
