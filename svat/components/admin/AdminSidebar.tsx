"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV_LINKS = [
  { label: "Curriculum", href: "/admin", icon: "quiz" },
  { label: "Generate Codes", href: "/admin/codes", icon: "vpn_key" },
  { label: "Users & Leaks", href: "/admin/users", icon: "manage_accounts" },
  { label: "Register Admin", href: "/admin/register", icon: "admin_panel_settings" },
] as const;

const LINKS = ADMIN_NAV_LINKS;

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="tm-sidebar dashboard-sidebar hidden w-[280px] flex-col border-r border-outline-variant bg-surface-container-low py-md md:flex">
      <nav className="flex-1 space-y-1">
        {LINKS.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
          return (
            <Link
              key={link.href}
              className={`tm-sidebar-link flex items-center gap-md px-lg py-md transition-colors ${
                active
                  ? "border-l-4 border-secondary bg-surface-container-high font-bold text-secondary shadow-sm"
                  : "border-l-4 border-transparent text-on-surface-variant hover:bg-surface-container hover:text-secondary"
              }`}
              href={link.href}
            >
              <span className="material-symbols-outlined">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
