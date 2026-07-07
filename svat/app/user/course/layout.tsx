import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "One Traders - Advanced Forex Mastery",
};

function CourseLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <span className="material-symbols-outlined animate-spin text-secondary">
        sync
      </span>
    </div>
  );
}

export default function CourseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Suspense fallback={<CourseLoading />}>{children}</Suspense>;
}
