import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | One Traders",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="admin-page">{children}</div>;
}
