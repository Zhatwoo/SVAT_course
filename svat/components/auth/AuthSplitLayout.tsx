"use client";

import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";

interface AuthSplitLayoutProps {
  aside: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}


export function AuthAsideHero({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="auth-aside-copy space-y-md">
      <AuthBrand />
      <h1 className="font-display-lg text-display-lg leading-tight text-white">{title}</h1>
      <p className="font-body-lg text-body-lg leading-relaxed text-on-primary-container/90">
        {description}
      </p>
    </div>
  );
}

export function AuthAsideChart() {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-lg shadow-2xl backdrop-blur-md">
      <div className="mb-md flex items-center justify-between gap-md border-b border-white/10 pb-md">
        <div className="flex shrink-0 gap-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-error/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-secondary-container" />
          <div className="h-2.5 w-2.5 rounded-full bg-on-tertiary-container" />
        </div>
        <span className="truncate font-label-sm text-label-sm text-on-primary-container/80">
          Live Market Analysis — EUR/USD
        </span>
      </div>
      <div className="flex h-[160px] items-end gap-1.5 sm:h-[176px]">
        {[24, 32, 16, 40, 28, 36, 20, 34, 26].map((height, index) => (
          <div
            key={index}
            className="w-full rounded-t-sm bg-secondary/70"
            style={{ height: `${height * 3}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function AuthAsideFeatures({
  items,
}: {
  items: ReadonlyArray<{ icon: string; title: string; description: string }>;
}) {
  return (
    <div className="grid w-full gap-sm">
      {items.map((feature) => (
        <div
          key={feature.title}
          className="flex gap-md rounded-xl border border-white/10 bg-white/5 p-md backdrop-blur-sm"
        >
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-secondary-fixed">
            {feature.icon}
          </span>
          <div className="min-w-0">
            <h3 className="font-label-md text-label-md text-white">{feature.title}</h3>
            <p className="font-body-sm text-body-sm leading-relaxed text-on-primary-container/75">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthAsideFootnote({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body-sm text-body-sm text-on-primary-container/50">{children}</p>
  );
}

export function AuthBrand() {
  return (
    <div className="mb-lg flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary shadow-lg shadow-secondary/25">
        <span
          className="material-symbols-outlined text-white"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          insights
        </span>
      </div>
      <div>
        <span className="block font-headline-md text-headline-md font-bold tracking-tight text-white">
          One Traders
        </span>
        <span className="font-label-sm text-label-sm text-on-primary-container/70">
          Professional Trading Education
        </span>
      </div>
    </div>
  );
}

export function AuthMobileBrand() {
  return (
    <div className="mb-lg flex items-center gap-2 md:hidden">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        <span
          className="material-symbols-outlined text-sm text-white"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          insights
        </span>
      </div>
      <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary dark:text-on-primary">
        One Traders
      </span>
    </div>
  );
}

export function AuthPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-xl">
      <h2 className="font-headline-lg text-headline-lg mb-sm text-primary dark:text-on-primary">
        {title}
      </h2>
      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
        {description}
      </p>
    </div>
  );
}

export function AuthInfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-secondary/20 bg-secondary/5 px-md py-sm">
      <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-secondary">
        info
      </span>
      <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
        {children}
      </p>
    </div>
  );
}

export function AuthFooter() {
  return (
    <footer className="mt-xl w-full border-t border-outline-variant/60 pt-md">
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-label-sm text-label-sm text-outline">
          © 2026 One Traders. All rights reserved.
        </p>
        <div className="flex gap-md">
          <Link
            className="font-label-sm text-label-sm text-outline transition-colors hover:text-secondary"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="font-label-sm text-label-sm text-outline transition-colors hover:text-secondary"
            href="/terms"
          >
            Terms
          </Link>
          <a
            className="font-label-sm text-label-sm text-outline transition-colors hover:text-secondary"
            href="#"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function AuthSplitLayout({
  aside,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <div className="auth-split-container relative bg-surface text-on-surface">
      <div className="absolute right-4 top-4 z-50 md:right-8 md:top-8">
        <ThemeToggle />
      </div>

      <aside className="left-panel">
        <div className="auth-left-gradient" />
        <div
          className="trading-pattern"
          style={{
            backgroundImage: "radial-gradient(#316bf3 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="auth-aside-inner">{aside}</div>
      </aside>

      <main className="right-panel">
        <div className="auth-form-shell w-full max-w-[440px]">
          {children}
          {footer ?? <AuthFooter />}
        </div>
      </main>
    </div>
  );
}
