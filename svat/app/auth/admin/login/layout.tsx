import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AdminGuestOnly } from "@/components/auth/AdminGuestOnly";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Admin Login | One Traders",
};

export default function AdminLoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />
      <AdminGuestOnly>
        <div className={`${inter.variable} login-page`}>{children}</div>
      </AdminGuestOnly>
    </>
  );
}
