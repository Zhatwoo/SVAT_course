import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { Episode } from "../types";

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export async function getEpisodes(): Promise<Episode[]> {
  const q = query(collection(getClientDb(), "episodes"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Episode);
}

export async function getEpisodesByCourse(courseId: string): Promise<Episode[]> {
  const q = query(
    collection(getClientDb(), "episodes"),
    where("courseId", "==", courseId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Episode)
    .sort((a, b) => a.order - b.order);
}

export async function getEpisodesByChapter(
  chapterId: string,
): Promise<Episode[]> {
  const q = query(
    collection(getClientDb(), "episodes"),
    where("chapterId", "==", chapterId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Episode)
    .sort((a, b) => a.order - b.order);
}

export async function createEpisode(
  data: Omit<Episode, "id">,
): Promise<string> {
  const cleanData = omitUndefined(data);
  const ref = await addDoc(collection(getClientDb(), "episodes"), {
    ...cleanData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEpisode(
  episodeId: string,
  data: Partial<Omit<Episode, "id">>,
) {
  const cleanData = omitUndefined(data);
  await updateDoc(doc(getClientDb(), "episodes", episodeId), cleanData);
}

export async function deleteEpisode(episodeId: string) {
  await deleteDoc(doc(getClientDb(), "episodes", episodeId));
}
