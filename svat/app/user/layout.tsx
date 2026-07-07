import type { Metadata } from "next";
import { UserGuard } from "@/components/auth/UserGuard";

export const metadata: Metadata = {
  title: "One Traders | User Dashboard",
};

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <UserGuard>
      <div className="user-page">{children}</div>
    </UserGuard>
  );
}
