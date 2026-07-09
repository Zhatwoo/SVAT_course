import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getClientDb } from "../firebase/client";
import type { Chapter, Course, CourseCategory } from "../types";

export async function getCourses(): Promise<Course[]> {
  const q = query(collection(getClientDb(), "courses"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(getClientDb(), "courses", courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function updateCourse(
  courseId: string,
  data: Partial<Pick<Course, "title" | "description" | "thumbnailUrl" | "isPublished" | "order">>,
) {
  await updateDoc(doc(getClientDb(), "courses", courseId), data);
}

export async function createCourse(data: {
  title: string;
  category: CourseCategory;
  description: string;
  order: number;
}) {
  const ref = await addDoc(collection(getClientDb(), "courses"), {
    ...data,
    isPublished: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Permanently deletes a course together with all of its chapters and
 * episodes. Firestore has no cascade delete, so we remove children first.
 */
export async function deleteCourse(courseId: string): Promise<void> {
  const db = getClientDb();

  const [episodeSnap, chapterSnap] = await Promise.all([
    getDocs(query(collection(db, "episodes"), where("courseId", "==", courseId))),
    getDocs(query(collection(db, "chapters"), where("courseId", "==", courseId))),
  ]);

  const childDocs = [...episodeSnap.docs, ...chapterSnap.docs];

  // A batch is limited to 500 writes; chunk to stay safe on large courses.
  const CHUNK_SIZE = 450;
  for (let i = 0; i < childDocs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const child of childDocs.slice(i, i + CHUNK_SIZE)) {
      batch.delete(child.ref);
    }
    await batch.commit();
  }

  await deleteDoc(doc(db, "courses", courseId));
}

export async function getChaptersByCourse(courseId: string): Promise<Chapter[]> {
  const q = query(
    collection(getClientDb(), "chapters"),
    where("courseId", "==", courseId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Chapter)
    .sort((a, b) => a.order - b.order);
}

export async function getAllChapters(): Promise<Chapter[]> {
  const q = query(collection(getClientDb(), "chapters"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chapter);
}

export async function createChapter(data: {
  courseId: string;
  title: string;
  order: number;
}) {
  const ref = await addDoc(collection(getClientDb(), "chapters"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateChapter(
  chapterId: string,
  data: Partial<Pick<Chapter, "title" | "order">>,
) {
  await updateDoc(doc(getClientDb(), "chapters", chapterId), data);
}

export async function deleteChapter(chapterId: string) {
  await deleteDoc(doc(getClientDb(), "chapters", chapterId));
}
