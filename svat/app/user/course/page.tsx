"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useCourseData } from "@/hooks/useCourseData";
import { getChaptersByCourse } from "@/lib/firestore/courses";
import { getPlatformSettings } from "@/lib/firestore/platform";
import {
  getFirstIncompleteEpisode,
  markEpisodeComplete,
  updateWatchProgress,
} from "@/lib/firestore/progress";
import { logUserSecurityEvent } from "@/lib/firestore/userSecurityEvents";
import type { Chapter, EpisodeWithStatus } from "@/lib/types";

function EpisodeButton({
  episode,
  isSelected,
  onSelect,
}: {
  episode: EpisodeWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  if (episode.status === "locked") {
    return (
      <button
        className="flex w-full cursor-not-allowed items-start gap-md p-md text-left opacity-60"
        disabled
        type="button"
      >
        <div className="mt-1 flex-shrink-0">
          <span className="material-symbols-outlined text-outline">lock</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface-variant dark:text-on-primary-container">
            {episode.title}
          </span>
          <span className="font-body-sm text-body-sm text-outline">
            Complete the previous episode to unlock this one
          </span>
        </div>
      </button>
    );
  }

  const completed = episode.status === "completed";

  return (
    <button
      className={`flex w-full items-start gap-md p-md text-left transition-colors ${
        isSelected
          ? "border-l-4 border-secondary bg-surface-container-high dark:border-secondary-fixed dark:bg-surface-container-highest"
          : "border-l-4 border-transparent hover:bg-surface-container dark:hover:bg-surface-container-high"
      }`}
      onClick={() => onSelect(episode.id)}
      type="button"
    >
      <div className="mt-1 flex-shrink-0">
        <span
          className={`material-symbols-outlined ${
            completed
              ? "text-on-tertiary-container"
              : "text-secondary dark:text-secondary-fixed"
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {completed ? "check_circle" : "play_circle"}
        </span>
      </div>
      <div className="flex flex-col">
        <span
          className={`font-label-md text-label-md ${
            isSelected
              ? "font-bold text-secondary dark:text-secondary-fixed"
              : completed
                ? "text-on-tertiary-container"
                : ""
          }`}
        >
          {episode.title}
        </span>
        <span
          className={`font-body-sm text-body-sm ${
            isSelected
              ? "text-secondary-container dark:text-secondary-fixed"
              : "text-outline"
          }`}
        >
          {completed
            ? `Completed${episode.duration ? ` • ${episode.duration}` : ""}`
            : `Now watching${episode.duration ? ` • ${episode.duration}` : ""}`}
        </span>
      </div>
    </button>
  );
}

export default function CoursePage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") ?? undefined;
  const { user } = useAuth();
  const {
    course,
    episodesWithStatus,
    progressPercent,
    loading,
    error,
    activeCourseId,
  } = useCourseData(courseId);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [communityDiscordUrl, setCommunityDiscordUrl] = useState("");
  const [secureVideoUrl, setSecureVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCourseId) {
      setChapters([]);
      return;
    }
    getChaptersByCourse(activeCourseId).then(setChapters);
  }, [activeCourseId]);

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setCommunityDiscordUrl(settings.communityDiscordUrl ?? ""))
      .catch(() => setCommunityDiscordUrl(""));
  }, []);

  useEffect(() => {
    if (episodesWithStatus.length === 0) return;
    if (activeEpisodeId) {
      const current = episodesWithStatus.find((e) => e.id === activeEpisodeId);
      if (current && current.status !== "locked") return;
    }
    const next = getFirstIncompleteEpisode(episodesWithStatus);
    if (next) setActiveEpisodeId(next.id);
  }, [episodesWithStatus, activeEpisodeId]);

  const activeEpisode = useMemo(
    () => episodesWithStatus.find((e) => e.id === activeEpisodeId) ?? null,
    [episodesWithStatus, activeEpisodeId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSecureUrl() {
      if (!activeEpisode?.secureVideoPath || !user) {
        setSecureVideoUrl(null);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/secure-video-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ episodeId: activeEpisode.id }),
        });

        if (!response.ok) {
          if (!cancelled) setSecureVideoUrl(null);
          return;
        }

        const data = (await response.json()) as { url?: string };
        if (!cancelled) {
          setSecureVideoUrl(data.url ?? null);
        }
      } catch {
        if (!cancelled) setSecureVideoUrl(null);
      }
    }

    void loadSecureUrl();
    return () => {
      cancelled = true;
    };
  }, [activeEpisode?.id, activeEpisode?.secureVideoPath, user]);

  const episodesByChapter = useMemo(() => {
    return chapters.map((chapter) => ({
      chapter,
      episodes: episodesWithStatus.filter((e) => e.chapterId === chapter.id),
    }));
  }, [chapters, episodesWithStatus]);

  const handleComplete = useCallback(async () => {
    if (!user || !activeEpisode || activeEpisode.progress?.completed) return;
    await markEpisodeComplete(user.uid, activeEpisode);
    const currentIndex = episodesWithStatus.findIndex(
      (e) => e.id === activeEpisode.id,
    );
    const next = episodesWithStatus
      .slice(currentIndex + 1)
      .find((e) => e.status !== "locked");
    if (next) setActiveEpisodeId(next.id);
  }, [user, activeEpisode, episodesWithStatus]);

  const handleProgress = useCallback(
    async (percent: number) => {
      if (!user || !activeEpisode) return;
      await updateWatchProgress(user.uid, activeEpisode, percent);
    },
    [user, activeEpisode],
  );

  const handleSecurityEvent = useCallback(
    async (
      eventType: "screenshot_attempt" | "screen_record_suspected" | "visibility_hidden",
      context?: Record<string, unknown>,
    ) => {
      if (!user || !activeEpisode) return;
      try {
        await logUserSecurityEvent({
          eventType,
          userId: user.uid,
          userEmail: user.email ?? undefined,
          episodeId: activeEpisode.id,
          courseId: activeEpisode.courseId,
          context,
        });
      } catch {
        // non-blocking
      }
    },
    [user, activeEpisode],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  return (
    <div className="tv-course-shell flex h-screen flex-col overflow-hidden font-body-md text-foreground transition-colors duration-300">
      <TopNav
        links={[
          { label: "Dashboard", href: "/user" },
          {
            label: "Courses",
            href: courseId ? `/user/course?courseId=${courseId}` : "/user/course",
            active: true,
          },
          { label: "Community", href: communityDiscordUrl || "#" },
        ]}
        progressPercent={progressPercent}
        showProgress
      />

      <main className="flex flex-1 overflow-hidden">
        <aside className="custom-scrollbar tv-panel m-md mr-0 flex h-[calc(100%-16px)] w-[320px] flex-col overflow-y-auto">
          <div className="tv-header p-md">
            <div className="mb-base flex items-center gap-sm">
              <span className="material-symbols-outlined text-secondary dark:text-secondary-fixed">
                school
              </span>
              <span className="font-headline-sm text-headline-sm text-primary dark:text-on-surface">
                {course?.title ?? "Course"}
              </span>
            </div>
            {course?.description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-surface-variant">
                {course.description}
              </p>
            )}
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-outline">
              Lessons
            </p>
          </div>

          <div className="flex flex-col">
            {episodesWithStatus.length === 0 ? (
              <p className="p-md font-body-sm text-body-sm text-on-surface-variant">
                No episodes yet. Check back once the admin publishes lessons.
              </p>
            ) : (
              episodesByChapter.map(({ chapter, episodes }) => (
                <div key={chapter.id}>
                  <p className="px-md pt-md font-label-sm text-label-sm uppercase tracking-wider text-outline">
                    {chapter.title}
                  </p>
                  {episodes.map((episode) => (
                    <EpisodeButton
                      key={episode.id}
                      episode={episode}
                      isSelected={activeEpisodeId === episode.id}
                      onSelect={setActiveEpisodeId}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="custom-scrollbar flex-1 overflow-y-auto p-lg">
          <div className="mx-auto max-w-[1000px] space-y-lg">
            {error && (
              <div className="rounded-lg border border-error-container bg-error-container px-lg py-md text-on-error-container">
                <p className="font-body-sm text-body-sm">{error}</p>
              </div>
            )}

            {activeEpisode ? (
              <>
                <div className="tv-video-frame relative aspect-video overflow-hidden">
                  <VideoPlayer
                    key={secureVideoUrl ? `secure-${activeEpisode.id}` : activeEpisode.youtubeVideoId}
                    onComplete={handleComplete}
                    onProgress={handleProgress}
                    secureUrl={secureVideoUrl ?? undefined}
                    videoId={secureVideoUrl ? undefined : activeEpisode.youtubeVideoId}
                    watermarkText="ONETRADERS"
                    onSecurityEvent={handleSecurityEvent}
                  />
                </div>

                <div className="tv-panel space-y-md p-lg">
                  <div>
                    <p className="font-label-sm text-label-sm uppercase tracking-widest text-secondary">
                      Episode {activeEpisode.episodeNumber}
                      {activeEpisode.duration ? ` • ${activeEpisode.duration}` : ""}
                    </p>
                    <h1 className="font-headline-lg text-headline-lg text-primary dark:text-on-surface">
                      {activeEpisode.title}
                    </h1>
                    {course?.description && (
                      <p className="mt-sm font-body-md text-body-md text-on-surface-variant dark:text-on-surface-variant">
                        {course.description}
                      </p>
                    )}
                  </div>

                  {!user && (
                    <div className="rounded-lg border border-outline-variant bg-surface-container-low px-lg py-md">
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Log in to save your progress and unlock the next episodes.
                      </p>
                      <Link
                        className="mt-sm inline-block font-label-md text-secondary hover:underline"
                        href="/auth/login"
                      >
                        Log in
                      </Link>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-3xl text-center">
                <span className="material-symbols-outlined mb-md text-[64px] text-outline">
                  school
                </span>
                <h2 className="font-headline-md text-headline-md mb-sm text-primary">
                  {course ? "No lessons in this course yet" : "No courses available"}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {course
                    ? "The admin has not published any episodes for this course yet."
                    : "The admin has not created any courses yet."}
                </p>
                <Link
                  className="mt-md font-label-md text-secondary hover:underline"
                  href="/user"
                >
                  Back to Dashboard
                </Link>
              </div>
            )}
            <div className="h-24" />
          </div>
        </section>
      </main>

      <Footer variant="compact" />
    </div>
  );
}
