"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopNav from "@/components/layout/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getPlatformSettings } from "@/lib/firestore/platform";
import UserDashboardFooter from "@/app/components/UserDashboardFooter";
import UserDashboardHeader from "@/app/components/UserDashboardHeader";
import UserDashboardSidebar from "@/app/components/UserDashboardSidebar";
import {
  getCategoryIcon,
  useDashboardCourses,
} from "@/hooks/useDashboardCourses";
import type { UserProgress } from "@/lib/types";

function getStatusLabel(percent: number) {
  if (percent === 0) return "Not started";
  if (percent === 100) return "Completed";
  return "In progress";
}

function getStatusClass(percent: number) {
  if (percent === 100) return "bg-tertiary-fixed text-on-tertiary-fixed-variant";
  if (percent > 0) return "bg-surface-container-highest text-on-surface-variant";
  return "bg-surface-container text-on-surface-variant";
}

type TradingViewConfig = Record<string, unknown>;

function TradingViewWidget({
  scriptSrc,
  config,
  className,
}: {
  scriptSrc: string;
  config: TradingViewConfig;
  className?: string;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container) return;

    container.innerHTML = "";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = scriptSrc;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [container, config, scriptSrc]);

  return <div ref={setContainer} className={className} />;
}

export default function UserDashboardPage() {
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const [communityDiscordUrl, setCommunityDiscordUrl] = useState("");
  const [tvTheme, setTvTheme] = useState<"light" | "dark">("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    coursesWithProgress,
    overallProgress,
    continueCourse,
    completedLessons,
    episodes,
    loading,
    error,
  } = useDashboardCourses();

  const firstName = profile?.displayName?.split(" ")[0] ?? "Student";
  const curriculumHref = continueCourse?.courseHref ?? "/user/course";
  const completedCoursesCount = coursesWithProgress.filter(
    (course) => course.progressPercent === 100,
  ).length;
  const activeCoursesCount = coursesWithProgress.filter(
    (course) => course.progressPercent > 0 && course.progressPercent < 100,
  ).length;

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setCommunityDiscordUrl(settings.communityDiscordUrl ?? ""))
      .catch(() => setCommunityDiscordUrl(""));
  }, []);

  useEffect(() => {
    setTvTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const learningHistory = completedLessons
    .map((p: UserProgress) => {
      const episode = episodes.find((e) => e.id === p.episodeId);
      const course = coursesWithProgress.find((c) => c.id === p.courseId);
      if (!episode) return null;
      return {
        id: p.id,
        title: episode.title,
        category: course?.category ?? "—",
        duration: episode.duration ?? "—",
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  if (loading) {
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
          { label: "Dashboard", href: "/user", active: true },
          { label: "Courses", href: "/user/course" },
          { label: "Community", href: communityDiscordUrl || "#" },
        ]}
        progressPercent={overallProgress}
        showProgress
      />

      <div className="flex min-h-[calc(100vh-64px)]">
        <UserDashboardSidebar
          curriculumHref={curriculumHref}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="flex-grow p-md md:p-lg">
          {error && (
            <div className="mb-lg rounded-lg border border-error-container bg-error-container px-lg py-md text-on-error-container">
              <p className="font-body-sm text-body-sm">{error}</p>
            </div>
          )}

          <UserDashboardHeader
            continueCourse={continueCourse ? { courseHref: continueCourse.courseHref } : null}
            firstName={firstName}
            overallProgress={overallProgress}
          />

          <section className="mb-xl overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <TradingViewWidget
              className="h-[48px] w-full"
              config={{
                symbols: [
                  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
                  { proName: "OANDA:NAS100USD", title: "Nasdaq 100" },
                  { proName: "FX:EURUSD", title: "EUR/USD" },
                  { proName: "BITSTAMP:BTCUSD", title: "BTC/USD" },
                  { proName: "BITSTAMP:ETHUSD", title: "ETH/USD" },
                  { proName: "TVC:GOLD", title: "Gold" },
                ],
                showSymbolLogo: true,
                isTransparent: false,
                displayMode: "adaptive",
                colorTheme: tvTheme,
                theme: tvTheme,
                backgroundColor: tvTheme === "dark" ? "#0b1220" : "#ffffff",
                locale: "en",
              }}
              scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
            />
          </section>

          <section className="mb-xl grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
            <div className="tv-panel p-lg">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Overall Progress
              </p>
              <p className="mt-sm font-headline-md text-headline-md text-primary">
                {overallProgress}%
              </p>
            </div>
            <div className="tv-panel p-lg">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Active Courses
              </p>
              <p className="mt-sm font-headline-md text-headline-md text-primary">
                {activeCoursesCount}
              </p>
            </div>
            <div className="tv-panel p-lg">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Completed Courses
              </p>
              <p className="mt-sm font-headline-md text-headline-md text-primary">
                {completedCoursesCount}
              </p>
            </div>
            <div className="tv-panel p-lg">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Lessons Done
              </p>
              <p className="mt-sm font-headline-md text-headline-md text-primary">
                {completedLessons.length}
              </p>
            </div>
          </section>

          {continueCourse && (
            <div className="card-flat mb-xl flex flex-col overflow-hidden md:flex-row md:h-[280px]">
              <div className="relative h-48 w-full overflow-hidden md:h-full md:w-2/5">
                {continueCourse.displayThumbnail ? (
                  <img
                    alt={continueCourse.title}
                    className="h-full w-full object-cover"
                    src={continueCourse.displayThumbnail}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                    <span className="material-symbols-outlined text-[48px] text-secondary">
                      school
                    </span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4 h-1 rounded bg-white/30">
                  <div
                    className="h-full rounded bg-secondary transition-all"
                    style={{ width: `${continueCourse.progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-col justify-center p-xl md:w-3/5">
                <span className="mb-sm font-label-sm text-label-sm uppercase tracking-widest text-secondary">
                  Continue where you left off
                </span>
                <h2 className="font-headline-md text-headline-md mb-sm text-primary">
                  {continueCourse.title}
                </h2>
                <p className="font-body-md text-body-md mb-md text-on-surface-variant">
                  {continueCourse.currentEpisodeTitle
                    ? `Next: ${continueCourse.currentEpisodeTitle}`
                    : continueCourse.description || "Start your learning journey."}
                </p>
                <p className="mb-lg font-body-sm text-body-sm text-on-surface-variant">
                  {continueCourse.completedEpisodes} of {continueCourse.totalEpisodes}{" "}
                  episodes completed
                </p>
                <Link
                  className="inline-flex w-fit items-center gap-sm rounded bg-secondary px-lg py-md font-label-md text-label-md text-on-secondary hover:opacity-90"
                  href={continueCourse.courseHref}
                >
                  Go to Course
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          )}

          <section className="mb-xl">
            <div className="mb-lg flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm text-primary">
                My Courses
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {coursesWithProgress.length} available
              </span>
            </div>

            {coursesWithProgress.length === 0 ? (
              <div className="card-flat p-xl text-center">
                <span className="material-symbols-outlined mb-md text-[48px] text-outline">
                  school
                </span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  No courses yet. Wait for the admin to publish content.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-3">
                {coursesWithProgress.map((course) => (
                  <div
                    key={course.id}
                    className="card-flat flex flex-col overflow-hidden transition-colors hover:border-secondary"
                  >
                    {course.displayThumbnail ? (
                      <img
                        alt={course.title}
                        className="h-32 w-full object-cover"
                        src={course.displayThumbnail}
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-surface-container-high">
                        <span className="material-symbols-outlined text-[40px] text-secondary">
                          {getCategoryIcon(course.category)}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col p-lg">
                    <div className="mb-md flex items-start justify-between gap-sm">
                      <div className="flex items-center gap-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high">
                          <span className="material-symbols-outlined text-secondary">
                            {getCategoryIcon(course.category)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-label-md text-label-md font-bold text-primary">
                            {course.title}
                          </h3>
                          <p className="font-label-sm text-label-sm capitalize text-on-surface-variant">
                            {course.category}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded px-sm py-xs font-label-sm text-label-sm font-bold uppercase tracking-tighter ${getStatusClass(course.progressPercent)}`}
                      >
                        {getStatusLabel(course.progressPercent)}
                      </span>
                    </div>

                    <div className="mb-sm flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Progress
                      </span>
                      <span className="font-label-sm text-label-sm font-bold">
                        {course.progressPercent}%
                      </span>
                    </div>
                    <div className="mb-md h-2 w-full rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>

                    <p className="mb-lg font-body-sm text-body-sm text-on-surface-variant">
                      {course.completedEpisodes}/{course.totalEpisodes} episodes
                      {course.currentEpisodeTitle && (
                        <>
                          {" "}
                          · <span className="text-secondary">Next:</span>{" "}
                          {course.currentEpisodeTitle}
                        </>
                      )}
                    </p>

                    <Link
                      className="mt-auto flex w-full items-center justify-center gap-sm rounded bg-secondary py-md font-label-md text-label-md text-on-secondary transition-opacity hover:opacity-90 active:scale-95"
                      href={course.courseHref}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        play_circle
                      </span>
                      {course.progressPercent === 0 ? "Start Course" : "Continue Course"}
                    </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {learningHistory.length > 0 && (
            <section className="card-flat overflow-hidden">
              <div className="border-b border-outline-variant p-lg">
                <h3 className="font-headline-sm text-headline-sm">
                  Recently Completed
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-outline-variant bg-surface-container-low">
                    <tr>
                      <th className="px-xl py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                        Episode
                      </th>
                      <th className="px-xl py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                        Category
                      </th>
                      <th className="px-xl py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {learningHistory.map((row) =>
                      row ? (
                        <tr key={row.id} className="zebra-row">
                          <td className="px-xl py-md font-body-md text-body-md font-semibold">
                            {row.title}
                          </td>
                          <td className="px-xl py-md font-body-sm text-body-sm capitalize">
                            {row.category}
                          </td>
                          <td className="px-xl py-md font-body-sm text-body-sm">
                            {row.duration}
                          </td>
                        </tr>
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="tv-panel mt-xl overflow-hidden">
            <div className="tv-header flex items-center justify-between px-lg py-md">
              <h3 className="font-headline-sm text-headline-sm text-primary">
                TradingView Tools
              </h3>
              <span className="tv-chip px-sm py-xs font-label-sm text-label-sm text-on-surface-variant">
                Live market widgets
              </span>
            </div>
            <div className="p-lg">
              <p className="mb-md font-body-sm text-body-sm text-on-surface-variant">
                Professional market dashboard for Forex, Crypto, Indices, and Gold.
              </p>

              <div className="grid grid-cols-1 gap-md">
                <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
                  <TradingViewWidget
                    className="h-[680px] w-full"
                    config={{
                      autosize: true,
                      symbol: "OANDA:XAUUSD",
                      interval: "60",
                      timezone: "Etc/UTC",
                    theme: tvTheme,
                      style: "1",
                      locale: "en",
                      enable_publishing: false,
                      hide_top_toolbar: false,
                      hide_legend: false,
                      save_image: false,
                      withdateranges: true,
                      allow_symbol_change: true,
                      calendar: false,
                      support_host: "https://www.tradingview.com",
                    }}
                    scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                  />
                </div>
              </div>

            </div>
          </section>
        </main>
      </div>

      <UserDashboardFooter />
    </div>
  );
}
