"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/auth/AdminGuard";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  createChapter,
  createCourse,
  getAllChapters,
  getCourses,
  updateCourse,
} from "@/lib/firestore/courses";
import {
  createEpisode,
  deleteEpisode,
  getEpisodes,
  updateEpisode,
} from "@/lib/firestore/episodes";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnail,
} from "@/lib/youtube";
import {
  FIREBASE_SETUP_MESSAGE,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { getFirebaseErrorMessage } from "@/lib/firebase/errors";
import {
  getPlatformSettings,
  updateCommunityDiscordUrl,
} from "@/lib/firestore/platform";
import { logAdminActivity } from "@/lib/firestore/activityLogs";
import type { Chapter, Course, Episode } from "@/lib/types";

type FormStatus = "idle" | "publishing" | "success";

function parseDurationToMinutes(duration?: string): number | null {
  if (!duration) return null;
  const value = duration.trim();
  if (!value) return null;

  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm + ss / 60;
  }

  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 60 + mm + ss / 60;
  }

  return null;
}

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [filterChapter, setFilterChapter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [secureVideoPath, setSecureVideoPath] = useState("");

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [communityDiscordUrl, setCommunityDiscordUrl] = useState("");
  const [communityInput, setCommunityInput] = useState("");
  const [savingCommunity, setSavingCommunity] = useState(false);

  const firebaseReady = isFirebaseConfigured();

  const previewVideoId = extractYouTubeVideoId(youtubeUrl);

  const loadData = useCallback(async () => {
    if (!firebaseReady) {
      setCourses([]);
      setChapters([]);
      setEpisodes([]);
      setLoading(false);
      return;
    }

    setLoadError(null);
    try {
      const [courseData, chapterData, episodeData, settings] = await Promise.all([
        getCourses(),
        getAllChapters(),
        getEpisodes(),
        getPlatformSettings(),
      ]);
      setCourses(courseData);
      setChapters(chapterData);
      setEpisodes(episodeData);
      const discord = settings.communityDiscordUrl ?? "";
      setCommunityDiscordUrl(discord);
      setCommunityInput(discord);
      if (chapterData.length > 0 && !chapterId) {
        setChapterId(chapterData[0].id);
      }
      if (courseData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(courseData[0].id);
      }
    } catch (err) {
      setLoadError(
        getFirebaseErrorMessage(
          err,
          "Failed to load data. Check Firebase connection and rules.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [chapterId, selectedCourseId, firebaseReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedCourseId) return;
    const firstChapter = chapters.find((c) => c.courseId === selectedCourseId);
    if (firstChapter) setChapterId(firstChapter.id);
  }, [selectedCourseId, chapters]);

  const chapterMap = useMemo(
    () => new Map(chapters.map((c) => [c.id, c])),
    [chapters],
  );

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const courseChapters = useMemo(
    () =>
      selectedCourseId
        ? chapters.filter((c) => c.courseId === selectedCourseId)
        : chapters,
    [chapters, selectedCourseId],
  );

  const filteredEpisodes = useMemo(() => {
    let list = episodes;
    if (selectedCourseId) {
      list = list.filter((e) => e.courseId === selectedCourseId);
    }
    if (filterChapter === "all") return list;
    return list.filter((e) => e.chapterId === filterChapter);
  }, [episodes, filterChapter, selectedCourseId]);

  const summaryStats = useMemo(() => {
    let knownDurationMinutes = 0;
    let unknownDurationCount = 0;

    for (const episode of filteredEpisodes) {
      const minutes = parseDurationToMinutes(episode.duration);
      if (minutes === null) {
        unknownDurationCount += 1;
      } else {
        knownDurationMinutes += minutes;
      }
    }

    return {
      totalVideos: filteredEpisodes.length,
      knownDurationMinutes,
      unknownDurationCount,
    };
  }, [filteredEpisodes]);

  const resetForm = () => {
    setYoutubeUrl("");
    setEpisodeNumber("");
    setEpisodeTitle("");
    setDuration("");
    setSecureVideoPath("");
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firebaseReady) {
      alert(FIREBASE_SETUP_MESSAGE);
      return;
    }
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId || !chapterId || !episodeTitle) return;

    const chapter = chapterMap.get(chapterId);
    if (!chapter) return;

    setFormStatus("publishing");
    try {
      const courseEpisodeCount = episodes.filter(
        (episode) => episode.courseId === chapter.courseId,
      ).length;

      const payload = {
        courseId: chapter.courseId,
        chapterId,
        title: episodeTitle,
        youtubeUrl,
        youtubeVideoId: videoId,
        episodeNumber: Number(episodeNumber) || courseEpisodeCount + 1,
        order: Number(episodeNumber) || courseEpisodeCount + 1,
        ...(duration.trim() ? { duration: duration.trim() } : {}),
        ...(secureVideoPath.trim() ? { secureVideoPath: secureVideoPath.trim() } : {}),
      };

      if (editingId) {
        await updateEpisode(editingId, payload);
        try {
          await logAdminActivity({
            action: "update",
            entity: "episode",
            entityId: editingId,
            details: {
              title: payload.title,
              chapterId: payload.chapterId,
              courseId: payload.courseId,
              episodeNumber: payload.episodeNumber,
            },
          });
        } catch (logError) {
          console.warn("Failed to write admin activity log (episode update)", logError);
        }
      } else {
        const newEpisodeId = await createEpisode(payload);
        try {
          await logAdminActivity({
            action: "create",
            entity: "episode",
            entityId: newEpisodeId,
            details: {
              title: payload.title,
              chapterId: payload.chapterId,
              courseId: payload.courseId,
              episodeNumber: payload.episodeNumber,
            },
          });
        } catch (logError) {
          console.warn("Failed to write admin activity log (episode create)", logError);
        }
      }

      const course = courses.find((c) => c.id === chapter.courseId);
      if (course && !course.thumbnailUrl) {
        await updateCourse(chapter.courseId, {
          thumbnailUrl: getYouTubeThumbnail(videoId),
        });
      }

      setFormStatus("success");
      resetForm();
      await loadData();
      setTimeout(() => setFormStatus("idle"), 2000);
    } catch (err) {
      setFormStatus("idle");
      alert(
        getFirebaseErrorMessage(
          err,
          "Failed to save episode. Check Firebase config and rules.",
        ),
      );
    }
  };

  const handleEdit = (episode: Episode) => {
    setEditingId(episode.id);
    setYoutubeUrl(episode.youtubeUrl);
    setChapterId(episode.chapterId);
    setEpisodeNumber(String(episode.episodeNumber));
    setEpisodeTitle(episode.title);
    setDuration(episode.duration ?? "");
    setSecureVideoPath(episode.secureVideoPath ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (episodeId: string) => {
    if (!firebaseReady) {
      alert(FIREBASE_SETUP_MESSAGE);
      return;
    }
    if (!confirm("Delete this episode?")) return;
    try {
      await deleteEpisode(episodeId);
      try {
        await logAdminActivity({
          action: "delete",
          entity: "episode",
          entityId: episodeId,
        });
      } catch (logError) {
        console.warn("Failed to write admin activity log (episode delete)", logError);
      }
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to delete episode."));
    }
  };

  const handleAddCourse = async () => {
    if (!firebaseReady) {
      alert(FIREBASE_SETUP_MESSAGE);
      return;
    }
    if (!newCourseTitle) return;
    try {
      const newId = await createCourse({
        title: newCourseTitle,
        category: "forex",
        description: "",
        order: courses.length + 1,
      });
      try {
        await logAdminActivity({
          action: "create",
          entity: "course",
          entityId: newId,
          details: {
            title: newCourseTitle,
            category: "forex",
            order: courses.length + 1,
          },
        });
      } catch (logError) {
        console.warn("Failed to write admin activity log (course create)", logError);
      }
      setNewCourseTitle("");
      setSelectedCourseId(newId);
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to add course."));
    }
  };

  const handleAddChapter = async () => {
    if (!firebaseReady) {
      alert(FIREBASE_SETUP_MESSAGE);
      return;
    }
    if (!newChapterTitle) return;
    if (!selectedCourseId) {
      alert("Add a course first before adding a chapter.");
      return;
    }
    try {
      const chaptersForCourse = chapters.filter(
        (c) => c.courseId === selectedCourseId,
      );
      const newChapterId = await createChapter({
        courseId: selectedCourseId,
        title: newChapterTitle,
        order: chaptersForCourse.length + 1,
      });
      try {
        await logAdminActivity({
          action: "create",
          entity: "chapter",
          entityId: newChapterId,
          details: {
            title: newChapterTitle,
            courseId: selectedCourseId,
            order: chaptersForCourse.length + 1,
          },
        });
      } catch (logError) {
        console.warn("Failed to write admin activity log (chapter create)", logError);
      }
      setNewChapterTitle("");
      await loadData();
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to add chapter."));
    }
  };

  const handleSaveCommunity = async () => {
    if (!firebaseReady) {
      alert(FIREBASE_SETUP_MESSAGE);
      return;
    }
    const url = communityInput.trim();
    if (url && !/^https?:\/\/(www\.)?discord(\.gg|\.com)\//i.test(url)) {
      alert("Please enter a valid Discord invite URL.");
      return;
    }
    try {
      setSavingCommunity(true);
      await updateCommunityDiscordUrl(url);
      try {
        await logAdminActivity({
          action: "settings_update",
          entity: "community_link",
          entityId: "settings/platform",
          details: { communityDiscordUrl: url || null },
        });
      } catch (logError) {
        console.warn("Failed to write admin activity log (community link)", logError);
      }
      setCommunityDiscordUrl(url);
      alert("Community link updated.");
    } catch (err) {
      alert(getFirebaseErrorMessage(err, "Failed to update community link."));
    } finally {
      setSavingCommunity(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page flex min-h-screen items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
      </div>
    );
  }

  return (
    <AdminGuard>
    <div className="min-h-screen bg-background text-foreground">
      <TopNav
        links={[
          { label: "Dashboard", href: "/admin" },
          { label: "Courses", href: "/admin", active: true },
          { label: "Community", href: communityDiscordUrl || "#" },
        ]}
      />

      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="mx-auto max-w-6xl flex-1 px-lg py-xl">
          {!firebaseReady && (
            <div className="mb-lg rounded-xl border border-error-container bg-error-container px-lg py-md text-on-error-container">
              <div className="flex items-start gap-md">
                <span className="material-symbols-outlined mt-0.5 shrink-0">
                  warning
                </span>
                <div>
                  <p className="font-label-md text-label-md font-bold">
                    Firebase not configured
                  </p>
                  <p className="mt-xs font-body-sm text-body-sm">
                    Add your Firebase credentials to{" "}
                    <code className="rounded bg-white/50 px-1">.env.local</code>{" "}
                    and restart the dev server to manage courses.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loadError && (
            <div className="mb-lg rounded-xl border border-error-container bg-error-container px-lg py-md text-on-error-container">
              <p className="font-body-sm text-body-sm">{loadError}</p>
            </div>
          )}

          <div className="mb-xl flex items-end justify-between">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary">
                Video Curriculum Management
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Upload and organize instructional trading content. Paste YouTube
                links from your channel.
              </p>
            </div>
          </div>

          <div className="mb-lg grid grid-cols-1 gap-md md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="font-label-md text-label-md mb-sm">Add Course</h3>
              <div className="flex gap-sm">
                <input
                  className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-sm text-on-surface dark:border-outline dark:bg-surface-container"
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="Course title"
                  value={newCourseTitle}
                />
                <button
                  className="rounded-lg bg-secondary px-md py-sm text-on-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!firebaseReady}
                  onClick={handleAddCourse}
                  type="button"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="font-label-md text-label-md mb-sm">Add Chapter</h3>
              <p className="mb-sm font-body-sm text-body-sm text-on-surface-variant">
                {selectedCourse
                  ? `For course: ${selectedCourse.title}`
                  : "Select a course below first"}
              </p>
              <div className="flex gap-sm">
                <input
                  className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-sm text-on-surface dark:border-outline dark:bg-surface-container"
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="Chapter title"
                  value={newChapterTitle}
                />
                <button
                  className="rounded-lg bg-secondary px-md py-sm text-on-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!firebaseReady || !selectedCourseId}
                  onClick={handleAddChapter}
                  type="button"
                >
                  Add
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="font-label-md text-label-md mb-sm">Community Link</h3>
              <p className="mb-sm font-body-sm text-body-sm text-on-surface-variant">
                Set Discord invite link for all users.
              </p>
              <div className="flex gap-sm">
                <input
                  className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-sm text-on-surface dark:border-outline dark:bg-surface-container"
                  onChange={(e) => setCommunityInput(e.target.value)}
                  placeholder="https://discord.gg/your-server"
                  type="url"
                  value={communityInput}
                />
                <button
                  className="rounded-lg bg-secondary px-md py-sm text-on-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!firebaseReady || savingCommunity}
                  onClick={handleSaveCommunity}
                  type="button"
                >
                  {savingCommunity ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          {courses.length > 0 && (
            <section className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md dark:border-outline dark:bg-surface-container-low">
              <h3 className="font-label-md text-label-md mb-sm">Your Courses</h3>
              <div className="flex flex-wrap gap-sm">
                {courses.map((course) => {
                  const count = chapters.filter((c) => c.courseId === course.id).length;
                  const isActive = course.id === selectedCourseId;
                  return (
                    <button
                      key={course.id}
                      className={`rounded-lg border px-md py-sm font-label-md text-label-md transition-colors ${
                        isActive
                          ? "border-secondary bg-secondary text-on-secondary"
                          : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:border-secondary"
                      }`}
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setFilterChapter("all");
                      }}
                      type="button"
                    >
                      {course.title}
                      <span className="ml-sm opacity-70">({count} chapters)</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-12 gap-lg">
            <div className="col-span-12 space-y-lg lg:col-span-4">
              <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg dark:border-outline dark:bg-surface-container-low">
                <h2 className="font-headline-sm text-headline-sm mb-md text-primary">
                  {editingId ? "Edit Lesson" : "Add New Lesson"}
                </h2>
                <form className="space-y-md" onSubmit={handleSubmit}>
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      YouTube URL
                    </label>
                    <input
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm text-on-surface transition-all focus:border-transparent focus:ring-2 focus:ring-secondary dark:border-outline dark:bg-surface-container"
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      required
                      type="url"
                      value={youtubeUrl}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-md">
                    <div className="space-y-xs">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Chapter
                      </label>
                      <select
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm text-on-surface dark:border-outline dark:bg-surface-container"
                        onChange={(e) => setChapterId(e.target.value)}
                        required
                        value={chapterId}
                        disabled={courseChapters.length === 0}
                      >
                        {courseChapters.length === 0 ? (
                          <option value="">Add a chapter first</option>
                        ) : (
                          courseChapters.map((ch) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="space-y-xs">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Episode #
                      </label>
                      <input
                        className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm text-on-surface dark:border-outline dark:bg-surface-container"
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        placeholder="01"
                        type="number"
                        value={episodeNumber}
                      />
                    </div>
                  </div>

                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Episode Title
                    </label>
                    <input
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm"
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      placeholder="e.g. Master Resistance & Support"
                      required
                      type="text"
                      value={episodeTitle}
                    />
                  </div>

                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Duration (optional)
                    </label>
                    <input
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm"
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="12:45"
                      type="text"
                      value={duration}
                    />
                  </div>

                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Secure Video Path (optional)
                    </label>
                    <input
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low p-md text-body-sm"
                      onChange={(e) => setSecureVideoPath(e.target.value)}
                      placeholder="protected-videos/course-1/episode-3.mp4"
                      type="text"
                      value={secureVideoPath}
                    />
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      If set, users will stream via short-lived signed URL instead of direct YouTube.
                    </p>
                  </div>

                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Preview
                    </label>
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-outline bg-primary-container">
                      {previewVideoId ? (
                        <img
                          alt="YouTube preview"
                          className="h-full w-full object-cover"
                          src={getYouTubeThumbnail(previewVideoId)}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-outline">
                          smart_display
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-sm">
                    <button
                      className={`flex flex-1 items-center justify-center gap-sm rounded py-md font-label-md text-label-md transition-colors ${
                        formStatus === "success"
                          ? "bg-tertiary-container text-on-tertiary-container"
                          : "bg-secondary text-on-secondary hover:bg-secondary-container"
                      }`}
                      disabled={formStatus === "publishing" || !firebaseReady}
                      type="submit"
                    >
                      {formStatus === "publishing" && (
                        <>
                          <span className="material-symbols-outlined animate-spin">
                            sync
                          </span>
                          Publishing...
                        </>
                      )}
                      {formStatus === "success" && (
                        <>
                          <span className="material-symbols-outlined">
                            check_circle
                          </span>
                          Published!
                        </>
                      )}
                      {formStatus === "idle" && (
                        <>
                          <span className="material-symbols-outlined">
                            add_circle
                          </span>
                          {editingId ? "Update Episode" : "Publish Episode"}
                        </>
                      )}
                    </button>
                    {editingId && (
                      <button
                        className="rounded border border-outline-variant px-md py-md"
                        onClick={resetForm}
                        type="button"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-xl border border-outline-variant bg-surface-container-high p-lg text-on-surface dark:border-primary dark:bg-primary-container dark:text-on-primary-container">
                <h3 className="font-label-md text-label-md mb-md uppercase tracking-widest text-on-surface-variant dark:text-on-primary-container/80">
                  Quick Summary
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display-lg text-display-lg leading-none text-primary dark:text-on-primary">
                      {summaryStats.totalVideos}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-primary-container/85">
                      Total Videos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline-sm text-headline-sm text-primary dark:text-on-primary">
                      {Math.round(summaryStats.knownDurationMinutes)}m
                      {summaryStats.unknownDurationCount > 0
                        ? ` +${summaryStats.unknownDurationCount}`
                        : ""}
                    </p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-on-primary-container/85">
                      Duration{" "}
                      {summaryStats.unknownDurationCount > 0
                        ? "(+ videos w/o time)"
                        : ""}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-8">
              <section className="flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest dark:border-outline dark:bg-surface-container-low">
                <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-high px-lg py-md dark:border-outline dark:bg-surface-container">
                  <h2 className="font-headline-sm text-headline-sm text-primary">
                    Currently Posted Videos
                  </h2>
                  <select
                    className="rounded border-none bg-surface px-sm py-1 font-label-md text-body-sm"
                    onChange={(e) => setFilterChapter(e.target.value)}
                    value={filterChapter}
                  >
                    <option value="all">All Chapters</option>
                    {courseChapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low">
                        <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                          #
                        </th>
                        <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                          Episode Details
                        </th>
                        <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                          Chapter
                        </th>
                        <th className="px-lg py-md text-right font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filteredEpisodes.map((video) => (
                        <tr
                          key={video.id}
                          className={`group cursor-pointer transition-colors hover:bg-surface-container ${
                            selectedRow === video.id
                              ? "bg-surface-container-highest"
                              : ""
                          }`}
                          onClick={() => setSelectedRow(video.id)}
                        >
                          <td className="px-lg py-md font-headline-sm text-headline-sm text-on-surface-variant opacity-30">
                            {String(video.episodeNumber).padStart(2, "0")}
                          </td>
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-md">
                              <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded bg-primary">
                                <img
                                  alt={video.title}
                                  className="h-full w-full object-cover opacity-70"
                                  src={getYouTubeThumbnail(video.youtubeVideoId)}
                                />
                                <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-sm text-on-primary">
                                  play_arrow
                                </span>
                              </div>
                              <div>
                                <p className="font-label-md text-label-md text-primary">
                                  {video.title}
                                </p>
                                <p className="font-body-sm text-body-sm text-on-surface-variant">
                                  {video.youtubeVideoId}
                                  {video.duration ? ` · ${video.duration}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            <span className="rounded bg-surface-container-high px-sm py-0.5 font-label-sm text-label-sm text-secondary">
                              {chapterMap.get(video.chapterId)?.title ?? "—"}
                            </span>
                          </td>
                          <td className="px-lg py-md text-right">
                            <div className="flex justify-end gap-md opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                className="font-label-sm text-label-sm text-secondary hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={!firebaseReady}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(video);
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="font-label-sm text-label-sm text-error hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={!firebaseReady}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(video.id);
                                }}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredEpisodes.length === 0 && (
                        <tr>
                          <td
                            className="px-lg py-xl text-center font-body-sm text-on-surface-variant"
                            colSpan={4}
                          >
                            No episodes yet. Add a course, chapter, then publish
                            your first YouTube lesson.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
    </AdminGuard>
  );
}
