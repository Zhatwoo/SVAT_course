"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
  icon?: string;
}

interface TopNavProps {
  links?: NavLink[];
  showNavLinks?: boolean;
  showProgress?: boolean;
  progressPercent?: number;
  showThemeToggle?: boolean;
  profileName?: string;
  profileImage?: string;
  /** Links shown in the mobile drawer. Falls back to `links` when omitted. */
  mobileNavLinks?: NavLink[];
}

const DEFAULT_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/user" },
  { label: "Courses", href: "/user/course", active: true },
  { label: "Market Analysis", href: "#" },
  { label: "Community", href: "#" },
];

export default function TopNav({
  links = DEFAULT_LINKS,
  showNavLinks = true,
  showProgress = false,
  progressPercent = 0,
  showThemeToggle = true,
  profileName,
  profileImage,
  mobileNavLinks,
}: TopNavProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = profileName ?? profile?.displayName ?? "Student";
  const isExternalLink = (href: string) => /^https?:\/\//i.test(href);

  const drawerLinks = mobileNavLinks ?? (showNavLinks ? links : []);

  // Prevent body scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    const isAdmin = profile?.role === "admin";
    await signOut();
    router.push(isAdmin ? "/admin/login" : "/auth/login");
  };

  const renderLink = (link: NavLink, onClick?: () => void, mobile = false) => {
    const baseClass = mobile
      ? `flex items-center gap-md rounded-lg px-md py-md font-label-md text-label-md transition-colors ${
          link.active
            ? "bg-surface-container-high text-secondary"
            : "text-on-surface-variant hover:bg-surface-container hover:text-secondary"
        }`
      : `rounded-lg px-sm py-xs font-label-md text-label-md transition-colors duration-200 ${
          link.active
            ? "bg-surface-container-high text-secondary"
            : "text-on-surface-variant hover:bg-surface-container hover:text-secondary"
        }`;

    const inner = (
      <>
        {mobile && link.icon && (
          <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
        )}
        {link.label}
      </>
    );

    if (link.href === "#" || isExternalLink(link.href)) {
      return (
        <a
          key={link.label}
          className={baseClass}
          href={link.href}
          onClick={onClick}
          rel={isExternalLink(link.href) ? "noreferrer noopener" : undefined}
          target={isExternalLink(link.href) ? "_blank" : undefined}
        >
          {inner}
        </a>
      );
    }

    return (
      <Link key={link.label} className={baseClass} href={link.href} onClick={onClick}>
        {inner}
      </Link>
    );
  };

  return (
    <>
    <header className="tm-topnav sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface-container-lowest/95 px-md sm:px-lg">
      <div className="flex min-w-0 items-center gap-sm sm:gap-lg">
        {drawerLinks.length > 0 && (
          <button
            aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container md:hidden"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <Link
          className="truncate font-headline-md text-headline-md font-bold text-primary"
          href={profile?.role === "admin" ? "/admin" : "/user"}
        >
          One Traders
        </Link>
        {showNavLinks && (
          <nav className="hidden items-center gap-sm md:flex">
            {links.map((link) => renderLink(link))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-sm sm:gap-md">
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
        <div className="flex items-center gap-sm border-l border-outline-variant pl-sm sm:pl-md">
          {profileImage ? (
            <img
              alt={displayName}
              className="h-8 w-8 rounded-full border border-outline object-cover"
              src={profileImage}
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-on-secondary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden max-w-[140px] truncate font-label-md text-label-md sm:block">
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

      {/* Mobile navigation drawer (rendered outside the header so the
          header's backdrop-filter does not clip the fixed overlay) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-[320px] flex-col border-r border-outline-variant bg-surface-container-lowest shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-outline-variant px-md">
              <span className="font-headline-md text-headline-md font-bold text-primary">
                One Traders
              </span>
              <button
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container"
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-xs overflow-y-auto p-md">
              {drawerLinks.map((link) => renderLink(link, () => setMenuOpen(false), true))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
