import {
  addDoc,
  arrayRemove,
  arrayUnion,
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

export function normalizeCourseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canUserViewCourse(
  course: Course,
  email?: string | null,
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  if (!course.isPrivate) return true;
  const normalized = email ? normalizeCourseEmail(email) : "";
  if (!normalized) return false;
  return (course.allowedEmails ?? []).includes(normalized);
}

export async function getCourses(): Promise<Course[]> {
  const q = query(collection(getClientDb(), "courses"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Course);
}

/**
 * Ensures older course docs have isPrivate/allowedEmails so student
 * queries (`isPrivate == false`) include them.
 */
export async function ensureCourseVisibilityDefaults(
  courses: Course[],
): Promise<void> {
  const missing = courses.filter((course) => course.isPrivate === undefined);
  if (missing.length === 0) return;

  await Promise.all(
    missing.map((course) =>
      updateDoc(doc(getClientDb(), "courses", course.id), {
        isPrivate: false,
        allowedEmails: course.allowedEmails ?? [],
      }),
    ),
  );
}

/**
 * Student-safe course list. Avoids a single unfiltered collection query
 * (which fails when any private course is denied by rules).
 */
export async function getVisibleCourses(options: {
  email?: string | null;
  isAdmin?: boolean;
}): Promise<Course[]> {
  const { email, isAdmin = false } = options;
  if (isAdmin) {
    return getCourses();
  }

  const db = getClientDb();
  const coursesRef = collection(db, "courses");
  const normalizedEmail = email ? normalizeCourseEmail(email) : "";
  const byId = new Map<string, Course>();

  // Prefer a full list when rules allow it (no inaccessible private courses).
  try {
    const all = await getCourses();
    return all
      .filter((course) => canUserViewCourse(course, email, false))
      .sort((a, b) => a.order - b.order);
  } catch {
    // Fall through to targeted queries.
  }

  const publicSnap = await getDocs(
    query(coursesRef, where("isPrivate", "==", false)),
  );
  for (const d of publicSnap.docs) {
    byId.set(d.id, { id: d.id, ...d.data() } as Course);
  }

  if (normalizedEmail) {
    const allowedSnap = await getDocs(
      query(
        coursesRef,
        where("allowedEmails", "array-contains", normalizedEmail),
      ),
    );
    for (const d of allowedSnap.docs) {
      byId.set(d.id, { id: d.id, ...d.data() } as Course);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.order - b.order);
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(getClientDb(), "courses", courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function updateCourse(
  courseId: string,
  data: Partial<
    Pick<
      Course,
      | "title"
      | "description"
      | "thumbnailUrl"
      | "isPublished"
      | "order"
      | "isPrivate"
      | "allowedEmails"
    >
  >,
) {
  await updateDoc(doc(getClientDb(), "courses", courseId), data);
}

export async function setCoursePrivate(
  courseId: string,
  isPrivate: boolean,
): Promise<void> {
  // Keep allowedEmails when turning public so re-locking is easy.
  await updateDoc(doc(getClientDb(), "courses", courseId), { isPrivate });
}

export async function addCourseAllowedEmail(
  courseId: string,
  email: string,
): Promise<string> {
  const normalized = normalizeCourseEmail(email);
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  await updateDoc(doc(getClientDb(), "courses", courseId), {
    isPrivate: true,
    allowedEmails: arrayUnion(normalized),
  });
  return normalized;
}

export async function removeCourseAllowedEmail(
  courseId: string,
  email: string,
): Promise<void> {
  const normalized = normalizeCourseEmail(email);
  await updateDoc(doc(getClientDb(), "courses", courseId), {
    allowedEmails: arrayRemove(normalized),
  });
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
    isPrivate: false,
    allowedEmails: [],
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
