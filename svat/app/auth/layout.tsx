import type { Metadata } from "next";
import { GuestOnly } from "@/components/auth/GuestOnly";

export const metadata: Metadata = {
  title: "Authentication | One Traders",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <GuestOnly>{children}</GuestOnly>;
}
