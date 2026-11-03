"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { repairStudentEnrollment, readStudentAccessCodeHint } from "@/lib/firestore/accessCodes";
import { getVisibleCourses } from "@/lib/firestore/courses";
import { getEpisodesByCourse } from "@/lib/firestore/episodes";
import {
  getCourseProgressPercent,
  getFirstIncompleteEpisode,
  computeEpisodeStatuses,
  subscribeUserProgress,
} from "@/lib/firestore/progress";
import { getYouTubeThumbnail } from "@/lib/youtube";
import type { Course, Episode, UserProgress } from "@/lib/types";

export type CourseWithProgress = Course & {
  progressPercent: number;
  completedEpisodes: number;
  totalEpisodes: number;
  currentEpisodeTitle?: string;
  courseHref: string;
  displayThumbnail?: string;
};

function hasValidEnrollment(code?: string | null): boolean {
  return typeof code === "string" && code.trim().length > 0;
}

const CATEGORY_ICONS: Record<string, string> = {
  forex: "payments",
  crypto: "currency_bitcoin",
  indices: "trending_up",
  metals: "database",
};

export function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? "school";
}

export function useDashboardCourses() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setProgress([]);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (user && !hasValidEnrollment(profile?.accessCodeUsed)) {
          const enrolledCode = await repairStudentEnrollment(
            user.uid,
            readStudentAccessCodeHint(),
          );
          if (!enrolledCode) {
            setError(
              "Walang naka-link na access code sa account mo. Mag-log out, tapos mag-sign in ulit gamit ang access code mo.",
            );
            return;
          }
        }

        const courseData = await getVisibleCourses({
          email: user?.email ?? profile?.email,
          isAdmin: profile?.role === "admin",
        });
        const published = courseData.filter((c) => c.isPublished);
        const episodeLists = await Promise.all(
          published.map((course) => getEpisodesByCourse(course.id)),
        );
        if (!active) return;
        setCourses(published);
        setEpisodes(episodeLists.flat());
      } catch (err) {
        if (!active) return;
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          setError(
            "Hindi pa mabasa ang courses. I-publish ang latest firestore.rules, mag-log out, tapos mag-sign in ulit gamit ang access code.",
          );
          return;
        }
        setError("Failed to load courses. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, profile?.accessCodeUsed, profile?.email, profile?.role, user?.email]);

  useEffect(() => {
    if (!user) {
      setProgress([]);
      return;
    }
    return subscribeUserProgress(user.uid, setProgress);
  }, [user]);

  const coursesWithProgress = useMemo((): CourseWithProgress[] => {
    return courses
      .map((course) => {
      const courseEpisodes = episodes.filter((e) => e.courseId === course.id);
      const courseEpisodeIds = new Set(courseEpisodes.map((episode) => episode.id));
      const courseProgress = progress.filter(
        (entry) =>
          entry.courseId === course.id && courseEpisodeIds.has(entry.episodeId),
      );
      const progressPercent = getCourseProgressPercent(
        courseEpisodes,
        courseProgress,
      );
      const completedEpisodes = courseProgress.filter((p) => p.completed).length;
      const episodesWithStatus = computeEpisodeStatuses(
        courseEpisodes,
        courseProgress,
      );
      const current = getFirstIncompleteEpisode(episodesWithStatus);
      const firstEpisode = courseEpisodes[0];

      return {
        ...course,
        progressPercent,
        completedEpisodes,
        totalEpisodes: courseEpisodes.length,
        currentEpisodeTitle: current?.title,
        courseHref: `/user/course?courseId=${course.id}`,
        displayThumbnail:
          course.thumbnailUrl ??
          (firstEpisode?.youtubeVideoId
            ? getYouTubeThumbnail(firstEpisode.youtubeVideoId)
            : undefined),
      };
    })
      // Hide courses that have no episodes yet so leftover/empty courses
      // never show up on the student dashboard.
      .filter((course) => course.totalEpisodes > 0);
  }, [courses, episodes, progress]);

  const overallProgress = useMemo(() => {
    if (coursesWithProgress.length === 0) return 0;
    const total = coursesWithProgress.reduce(
      (sum, c) => sum + c.progressPercent,
      0,
    );
    return Math.round(total / coursesWithProgress.length);
  }, [coursesWithProgress]);

  const continueCourse = useMemo(() => {
    const inProgress = coursesWithProgress.find(
      (c) => c.progressPercent > 0 && c.progressPercent < 100,
    );
    return inProgress ?? coursesWithProgress[0] ?? null;
  }, [coursesWithProgress]);

  const completedLessons = useMemo(
    () => progress.filter((p) => p.completed),
    [progress],
  );

  return {
    coursesWithProgress,
    overallProgress,
    continueCourse,
    completedLessons,
    episodes,
    loading,
    error,
  };
}
