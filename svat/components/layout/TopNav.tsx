"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

interface TopNavProps {
  links?: NavLink[];
  showProgress?: boolean;
  progressPercent?: number;
  showThemeToggle?: boolean;
  profileName?: string;
  profileImage?: string;
}

const DEFAULT_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/user" },
  { label: "Courses", href: "/user/course", active: true },
  { label: "Market Analysis", href: "#" },
  { label: "Community", href: "#" },
];

export default function TopNav({
  links = DEFAULT_LINKS,
  showProgress = false,
  progressPercent = 0,
  showThemeToggle = true,
  profileName,
  profileImage,
}: TopNavProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const displayName = profileName ?? profile?.displayName ?? "Student";
  const isExternalLink = (href: string) => /^https?:\/\//i.test(href);

  const handleSignOut = async () => {
    const isAdmin = profile?.role === "admin";
    await signOut();
    router.push(isAdmin ? "/admin/login" : "/auth/login");
  };

  return (
    <header className="tm-topnav sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest/95 px-lg">
      <div className="flex items-center gap-lg">
        <Link
          className="font-headline-md text-headline-md font-bold text-primary"
          href={profile?.role === "admin" ? "/admin" : "/user"}
        >
          One Traders
        </Link>
        <nav className="hidden items-center gap-sm md:flex">
          {links.map((link) =>
            link.href === "#" || isExternalLink(link.href) ? (
              <a
                key={link.label}
                className={`rounded-lg px-sm py-xs font-label-md text-label-md transition-colors duration-200 ${
                  link.active
                    ? "bg-surface-container-high text-secondary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-secondary"
                }`}
                href={link.href}
                rel={isExternalLink(link.href) ? "noreferrer noopener" : undefined}
                target={isExternalLink(link.href) ? "_blank" : undefined}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                className={`rounded-lg px-sm py-xs font-label-md text-label-md transition-colors duration-200 ${
                  link.active
                    ? "bg-surface-container-high text-secondary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-secondary"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="flex items-center gap-md">
        {showProgress && (
          <div className="mr-md hidden flex-col items-end lg:flex">
            <span className="font-label-sm text-label-sm text-outline">
              Course Progress: {progressPercent}%
            </span>
            <div className="mt-1 h-1.5 w-32 rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-secondary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
        {showThemeToggle && <ThemeToggle />}
        <button
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary"
          type="button"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="flex items-center gap-sm border-l border-outline-variant pl-md">
          {profileImage ? (
            <img
              alt={displayName}
              className="h-8 w-8 rounded-full border border-outline object-cover"
              src={profileImage}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-on-secondary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden font-label-md text-label-md sm:block">
            {displayName}
          </span>
          <button
            className="ml-1 rounded-lg p-xs font-label-sm text-label-sm text-outline hover:bg-surface-container hover:text-error"
            onClick={handleSignOut}
            title="Sign out"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
