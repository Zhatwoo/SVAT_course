import { ref, uploadBytesResumable } from "firebase/storage";
import { getClientStorage } from "./client";

export function uploadProtectedVideo(
  file: File,
  courseId: string,
  episodeKey: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "mp4";
  const safeKey = episodeKey.replace(/[^a-zA-Z0-9_-]/g, "-") || "episode";
  const path = `protected-videos/${courseId}/${safeKey}-${Date.now()}.${extension}`;
  const storageRef = ref(getClientStorage(), path);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "video/mp4",
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          );
        }
      },
      reject,
      () => resolve(path),
    );
  });
}
