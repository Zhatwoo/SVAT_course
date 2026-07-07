import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { Episode, EpisodeWithStatus, UserProgress } from "../types";

export function progressDocId(userId: string, episodeId: string) {
  return `${userId}_${episodeId}`;
}

export async function getUserProgress(
  userId: string,
): Promise<UserProgress[]> {
  const q = query(
    collection(getClientDb(), "userProgress"),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProgress);
}

export function subscribeUserProgress(
  userId: string,
  callback: (progress: UserProgress[]) => void,
) {
  const q = query(
    collection(getClientDb(), "userProgress"),
    where("userId", "==", userId),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProgress),
    );
  });
}

export async function markEpisodeComplete(
  userId: string,
  episode: Episode,
  watchPercent = 100,
) {
  const id = progressDocId(userId, episode.id);
  await setDoc(doc(getClientDb(), "userProgress", id), {
    userId,
    episodeId: episode.id,
    courseId: episode.courseId,
    chapterId: episode.chapterId,
    watchPercent,
    completed: true,
    completedAt: serverTimestamp(),
    lastWatchedAt: serverTimestamp(),
  });
}

export async function updateWatchProgress(
  userId: string,
  episode: Episode,
  watchPercent: number,
) {
  const id = progressDocId(userId, episode.id);
  const completed = watchPercent >= 90;
  await setDoc(
    doc(getClientDb(), "userProgress", id),
    {
      userId,
      episodeId: episode.id,
      courseId: episode.courseId,
      chapterId: episode.chapterId,
      watchPercent,
      completed,
      ...(completed ? { completedAt: serverTimestamp() } : {}),
      lastWatchedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function computeEpisodeStatuses(
  episodes: Episode[],
  progressList: UserProgress[],
): EpisodeWithStatus[] {
  const progressMap = new Map(progressList.map((p) => [p.episodeId, p]));
  const sorted = [...episodes].sort((a, b) => a.order - b.order);

  return sorted.map((episode, index) => {
    const progress = progressMap.get(episode.id);
    if (progress?.completed) {
      return { ...episode, status: "completed", progress };
    }

    if (index === 0) {
      return { ...episode, status: "active", progress };
    }

    const prevEpisode = sorted[index - 1];
    const prevProgress = progressMap.get(prevEpisode.id);
    if (prevProgress?.completed) {
      return { ...episode, status: "active", progress };
    }

    return { ...episode, status: "locked", progress };
  });
}

export function getCourseProgressPercent(
  episodes: Episode[],
  progressList: UserProgress[],
): number {
  if (episodes.length === 0) return 0;
  const episodeIds = new Set(episodes.map((episode) => episode.id));
  const completed = progressList.filter(
    (progress) => progress.completed && episodeIds.has(progress.episodeId),
  ).length;
  return Math.round((completed / episodes.length) * 100);
}

export function getFirstIncompleteEpisode(
  episodes: EpisodeWithStatus[],
): EpisodeWithStatus | null {
  return (
    episodes.find((e) => e.status === "active") ??
    episodes.find((e) => !e.progress?.completed) ??
    episodes[0] ??
    null
  );
}
