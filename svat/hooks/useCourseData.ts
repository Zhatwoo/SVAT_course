"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeEpisodeStatuses,
  getCourseProgressPercent,
  subscribeUserProgress,
} from "@/lib/firestore/progress";
import { getEpisodesByCourse } from "@/lib/firestore/episodes";
import { getCourseById, getCourses } from "@/lib/firestore/courses";
import type { Course, Episode, UserProgress } from "@/lib/types";

export function useCourseData(courseId?: string) {
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(
    courseId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let targetCourseId = courseId ?? null;
        if (!targetCourseId) {
          const courses = await getCourses();
          const published = courses.filter((c) => c.isPublished);
          targetCourseId = published[0]?.id ?? null;
        }

        setActiveCourseId(targetCourseId);

        if (!targetCourseId) {
          setCourse(null);
          setEpisodes([]);
          return;
        }

        const [courseData, eps] = await Promise.all([
          getCourseById(targetCourseId),
          getEpisodesByCourse(targetCourseId),
        ]);
        setCourse(courseData);
        setEpisodes(eps);
      } catch {
        setError("Failed to load course. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  useEffect(() => {
    if (!user) {
      setProgress([]);
      return;
    }
    return subscribeUserProgress(user.uid, setProgress);
  }, [user]);

  const episodesWithStatus = computeEpisodeStatuses(episodes, progress);
  const episodeIds = new Set(episodes.map((episode) => episode.id));
  const courseProgress = progress.filter((entry) => episodeIds.has(entry.episodeId));
  const progressPercent = getCourseProgressPercent(episodes, courseProgress);

  return {
    course,
    episodes,
    episodesWithStatus,
    progress,
    progressPercent,
    activeCourseId,
    loading,
    error,
  };
}
