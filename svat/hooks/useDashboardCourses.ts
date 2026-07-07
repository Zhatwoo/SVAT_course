"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getCourses } from "@/lib/firestore/courses";
import { getEpisodes } from "@/lib/firestore/episodes";
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
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [courseData, episodeData] = await Promise.all([
          getCourses(),
          getEpisodes(),
        ]);
        setCourses(courseData.filter((c) => c.isPublished));
        setEpisodes(episodeData);
      } catch {
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!user) {
      setProgress([]);
      return;
    }
    return subscribeUserProgress(user.uid, setProgress);
  }, [user]);

  const coursesWithProgress = useMemo((): CourseWithProgress[] => {
    return courses.map((course) => {
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
          (firstEpisode
            ? getYouTubeThumbnail(firstEpisode.youtubeVideoId)
            : undefined),
      };
    });
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
