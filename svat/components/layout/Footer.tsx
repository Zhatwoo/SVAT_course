import Link from "next/link";

type DashboardLayout = "admin" | "user-expanded" | "user-collapsed";

interface FooterProps {
  variant?: "default" | "compact";
  dashboardLayout?: DashboardLayout;
}

function footerLayoutClass(dashboardLayout?: DashboardLayout): string {
  if (!dashboardLayout) return "";
  if (dashboardLayout === "admin") return "dashboard-footer dashboard-footer--admin";
  if (dashboardLayout === "user-collapsed") {
    return "dashboard-footer dashboard-footer--collapsed";
  }
  return "dashboard-footer dashboard-footer--expanded";
}

export default function Footer({
  variant = "default",
  dashboardLayout,
}: FooterProps) {
  const layoutClass = footerLayoutClass(dashboardLayout);

  const links = (
    <nav
      aria-label="Footer"
      className="flex flex-wrap items-center gap-x-lg gap-y-sm"
    >
      <Link
        className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-secondary dark:hover:text-secondary"
        href="/terms"
      >
        Terms of Service
      </Link>
      <Link
        className="font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-secondary dark:hover:text-secondary"
        href="/privacy"
      >
        Privacy Policy
      </Link>
      <span className="font-label-sm text-label-sm text-on-surface-variant/60">
        Risk Disclosure
      </span>
      <span className="font-label-sm text-label-sm text-on-surface-variant/60">
        Help Center
      </span>
    </nav>
  );

  if (variant === "compact") {
    return (
      <footer
        className={`border-t border-outline-variant bg-surface-container-lowest dark:border-outline dark:bg-surface-container-lowest ${layoutClass}`}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-md px-lg py-md md:flex-row md:px-xl">
          <p className="text-center font-label-sm text-label-sm text-on-surface-variant md:text-left">
            © {new Date().getFullYear()} One Traders Education
          </p>
          {links}
        </div>
      </footer>
    );
  }

  return (
    <footer
      className={`border-t border-outline-variant bg-surface-container-lowest dark:border-outline dark:bg-surface-container-lowest ${layoutClass}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-md px-lg py-lg md:flex-row md:items-center md:justify-between md:gap-xl md:px-xl">
        <div className="min-w-0">
          <p className="font-label-md text-label-md font-bold text-primary dark:text-on-surface">
            One Traders
          </p>
          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} One Traders Education
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant/80">
            Professional trading education platform
          </p>
        </div>
        {links}
      </div>
    </footer>
  );
}
