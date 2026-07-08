"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import EconomicCalendar from "@/components/market-news/EconomicCalendar";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketNews } from "@/hooks/useMarketNews";
import { useDashboardCourses } from "@/hooks/useDashboardCourses";
import { getPlatformSettings } from "@/lib/firestore/platform";
import UserDashboardFooter from "@/app/components/UserDashboardFooter";
import UserDashboardSidebar from "@/app/components/UserDashboardSidebar";

export default function MarketNewsPage() {
  const { user } = useAuth();
  const [communityDiscordUrl, setCommunityDiscordUrl] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { continueCourse, overallProgress } = useDashboardCourses();
  const { events, loading, error, fetchedAt, refresh } = useMarketNews();

  const curriculumHref = continueCourse?.courseHref ?? "/user/course";

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setCommunityDiscordUrl(settings.communityDiscordUrl ?? ""))
      .catch(() => setCommunityDiscordUrl(""));
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav
        links={[
          { label: "Dashboard", href: "/user" },
          { label: "Courses", href: "/user/course" },
          { label: "Market News", href: "/user/market-news", active: true },
          { label: "Community", href: communityDiscordUrl || "#" },
        ]}
        showProgress
        progressPercent={overallProgress}
      />

      <div className="flex min-h-[calc(100vh-64px)] w-full min-w-0">
        <UserDashboardSidebar
          activeHref="/user/market-news"
          curriculumHref={curriculumHref}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main
          className={`dashboard-main w-full overflow-x-hidden p-md md:p-lg ${
            sidebarCollapsed ? "dashboard-main--collapsed" : "dashboard-main--expanded"
          }`}
        >
          <div className="mb-xl">
            <h1 className="font-headline-lg text-headline-lg mb-xs text-primary">
              Market News
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Track this week&apos;s macro releases, central bank events, and
              high-impact data that can move Forex, indices, crypto, and metals.
            </p>
            {fetchedAt && (
              <p className="mt-sm font-body-sm text-body-sm text-outline">
                Last updated{" "}
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                }).format(new Date(fetchedAt))}
              </p>
            )}
          </div>

          <EconomicCalendar
            error={error}
            events={events}
            loading={loading}
            onRefresh={refresh}
          />
        </main>
      </div>

      <UserDashboardFooter sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
}
