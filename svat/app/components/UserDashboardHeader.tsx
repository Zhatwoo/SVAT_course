"use client";

import Link from "next/link";

interface ContinueCourseHeaderData {
  courseHref: string;
}

interface UserDashboardHeaderProps {
  firstName: string;
  overallProgress: number;
  continueCourse: ContinueCourseHeaderData | null;
}

export default function UserDashboardHeader({
  firstName,
  overallProgress,
  continueCourse,
}: UserDashboardHeaderProps) {
  return (
    <div className="mb-xl flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-headline-lg text-headline-lg mb-xs text-primary">
          Welcome back, {firstName}.
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Overall progress:{" "}
          <span className="font-bold text-on-tertiary-container">{overallProgress}%</span>{" "}
          across your courses.
        </p>
      </div>
      {continueCourse && (
        <Link
          className="flex items-center justify-center gap-sm rounded-lg bg-secondary px-xl py-md font-headline-sm text-headline-sm text-on-secondary shadow-sm hover:opacity-90 active:scale-95"
          href={continueCourse.courseHref}
        >
          <span className="material-symbols-outlined">play_circle</span>
          Continue Learning
        </Link>
      )}
    </div>
  );
}
