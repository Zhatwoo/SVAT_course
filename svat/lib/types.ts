import type { Timestamp } from "firebase/firestore";

export type UserRole = "admin" | "student";

export type CourseCategory = "forex" | "crypto" | "indices" | "metals";

export type AdminActivityLogAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "settings_update";

export type AdminActivityLogEntity =
  | "course"
  | "chapter"
  | "episode"
  | "community_link"
  | "user"
  | "security_event";

export interface AdminActivityLog {
  id: string;
  action: AdminActivityLogAction;
  entity: AdminActivityLogEntity;
  entityId: string;
  actorUid: string | null;
  actorEmail: string | null;
  details?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isBlocked?: boolean;
  blockedReason?: string;
  createdAt: Timestamp;
}

export type UserSecurityEventType =
  | "screenshot_attempt"
  | "screen_record_suspected"
  | "visibility_hidden";

export interface UserSecurityEvent {
  id: string;
  userId: string;
  userEmail?: string;
  episodeId?: string;
  courseId?: string;
  eventType: UserSecurityEventType;
  context?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  description: string;
  thumbnailUrl?: string;
  order: number;
  isPublished: boolean;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

export interface Episode {
  id: string;
  courseId: string;
  chapterId: string;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  secureVideoPath?: string;
  episodeNumber: number;
  order: number;
  duration?: string;
}

export interface UserProgress {
  id: string;
  userId: string;
  episodeId: string;
  courseId: string;
  chapterId: string;
  watchPercent: number;
  completed: boolean;
  completedAt?: Timestamp;
  lastWatchedAt: Timestamp;
}

export type EpisodeWithStatus = Episode & {
  status: "completed" | "active" | "locked";
  progress?: UserProgress;
};
