import type { Metadata } from "next";
import { AdminRegisterGuard } from "@/components/auth/AdminRegisterGuard";

export const metadata: Metadata = {
  title: "Register Admin | One Traders",
};

export default function AdminRegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminRegisterGuard>{children}</AdminRegisterGuard>;
}
