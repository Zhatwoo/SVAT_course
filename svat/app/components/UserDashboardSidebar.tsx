"use client";

import Link from "next/link";

const SIDEBAR_LINKS = [
  { icon: "dashboard", label: "Dashboard", href: "/user" },
  { icon: "newspaper", label: "Market News", href: "/user/market-news" },
  {
    icon: "menu_book",
    label: "Curriculum",
    hrefKey: "curriculum" as const,
  },
] as const;

interface UserDashboardSidebarProps {
  sidebarCollapsed: boolean;
  curriculumHref: string;
  activeHref: string;
  onToggleCollapse: () => void;
}

export default function UserDashboardSidebar({
  sidebarCollapsed,
  curriculumHref,
  activeHref,
  onToggleCollapse,
}: UserDashboardSidebarProps) {
  return (
    <aside
      className={`tm-sidebar dashboard-sidebar hidden flex-col border-r border-outline-variant bg-surface-container-low py-md transition-all duration-300 md:flex ${
        sidebarCollapsed ? "w-[88px]" : "w-[280px]"
      }`}
    >
      <div className="mb-xl px-md">
        <div className="mb-base flex items-center justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <span className="material-symbols-outlined text-[20px] text-on-primary">
                terminal
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="font-headline-sm text-headline-sm text-primary">Academy</div>
            )}
          </div>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            onClick={onToggleCollapse}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarCollapsed ? "right_panel_open" : "left_panel_close"}
            </span>
          </button>
        </div>
        {!sidebarCollapsed && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Your learning dashboard
          </p>
        )}
      </div>

      <nav className="flex-grow space-y-1">
        {SIDEBAR_LINKS.map((link) => {
          const href = "hrefKey" in link ? curriculumHref : link.href;
          const isActive = activeHref === href;

          return (
            <Link
              key={link.label}
              className={`tm-sidebar-link flex items-center px-md py-md transition-colors ${
                isActive
                  ? "border-l-4 border-secondary bg-surface-container-high font-bold text-secondary opacity-95 shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
              href={href}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {!sidebarCollapsed && (
                <span className="ml-md font-label-md text-label-md">{link.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
