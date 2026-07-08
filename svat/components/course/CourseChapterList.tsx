"use client";

import type { Chapter, EpisodeWithStatus } from "@/lib/types";

function EpisodeButton({
  episode,
  isSelected,
  onSelect,
}: {
  episode: EpisodeWithStatus;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  if (episode.status === "locked") {
    return (
      <button
        className="flex w-full cursor-not-allowed items-start gap-md p-md text-left opacity-60"
        disabled
        type="button"
      >
        <div className="mt-1 flex-shrink-0">
          <span className="material-symbols-outlined text-outline">lock</span>
        </div>
        <div className="flex flex-col">
          <span className="font-label-md text-label-md text-on-surface-variant dark:text-on-primary-container">
            {episode.title}
          </span>
          <span className="font-body-sm text-body-sm text-outline">
            Complete the previous episode to unlock this one
          </span>
        </div>
      </button>
    );
  }

  const completed = episode.status === "completed";

  return (
    <button
      className={`flex w-full items-start gap-md p-md text-left transition-colors ${
        isSelected
          ? "border-l-4 border-secondary bg-surface-container-high dark:border-secondary-fixed dark:bg-surface-container-highest"
          : "border-l-4 border-transparent hover:bg-surface-container dark:hover:bg-surface-container-high"
      }`}
      onClick={() => onSelect(episode.id)}
      type="button"
    >
      <div className="mt-1 flex-shrink-0">
        <span
          className={`material-symbols-outlined ${
            completed
              ? "text-on-tertiary-container"
              : "text-secondary dark:text-secondary-fixed"
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {completed ? "check_circle" : "play_circle"}
        </span>
      </div>
      <div className="flex min-w-0 flex-col">
        <span
          className={`font-label-md text-label-md ${
            isSelected
              ? "font-bold text-secondary dark:text-secondary-fixed"
              : completed
                ? "text-on-tertiary-container"
                : ""
          }`}
        >
          {episode.title}
        </span>
        <span
          className={`font-body-sm text-body-sm ${
            isSelected
              ? "text-secondary-container dark:text-secondary-fixed"
              : "text-outline"
          }`}
        >
          {completed
            ? `Completed${episode.duration ? ` • ${episode.duration}` : ""}`
            : `Now watching${episode.duration ? ` • ${episode.duration}` : ""}`}
        </span>
      </div>
    </button>
  );
}

interface CollapsibleChapterProps {
  chapter: Chapter;
  episodes: EpisodeWithStatus[];
  isExpanded: boolean;
  activeEpisodeId: string | null;
  onToggle: () => void;
  onSelectEpisode: (id: string) => void;
}

export function CollapsibleChapter({
  chapter,
  episodes,
  isExpanded,
  activeEpisodeId,
  onToggle,
  onSelectEpisode,
}: CollapsibleChapterProps) {
  const completedCount = episodes.filter(
    (episode) => episode.status === "completed",
  ).length;

  return (
    <div className="border-b border-outline-variant last:border-b-0">
      <button
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-sm px-md py-md text-left transition-colors hover:bg-surface-container dark:hover:bg-surface-container-high"
        onClick={onToggle}
        type="button"
      >
        <span
          className={`material-symbols-outlined text-[20px] text-secondary transition-transform duration-200 dark:text-secondary-fixed ${
            isExpanded ? "rotate-90" : ""
          }`}
        >
          chevron_right
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-label-md text-label-md font-bold text-primary dark:text-on-surface">
            {chapter.title}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {completedCount}/{episodes.length} lessons completed
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-container-high px-sm py-xs font-label-sm text-label-sm text-on-surface-variant">
          {episodes.length}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          {episodes.map((episode) => (
            <EpisodeButton
              key={episode.id}
              episode={episode}
              isSelected={activeEpisodeId === episode.id}
              onSelect={onSelectEpisode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CourseChapterListProps {
  chapters: Chapter[];
  episodesByChapter: { chapter: Chapter; episodes: EpisodeWithStatus[] }[];
  orphanEpisodes: EpisodeWithStatus[];
  expandedChapterIds: Set<string>;
  activeEpisodeId: string | null;
  onToggleChapter: (chapterId: string) => void;
  onSelectEpisode: (id: string) => void;
}

export default function CourseChapterList({
  episodesByChapter,
  orphanEpisodes,
  expandedChapterIds,
  activeEpisodeId,
  onToggleChapter,
  onSelectEpisode,
}: CourseChapterListProps) {
  return (
    <div className="flex flex-col">
      {episodesByChapter.map(({ chapter, episodes }) => (
        <CollapsibleChapter
          key={chapter.id}
          activeEpisodeId={activeEpisodeId}
          chapter={chapter}
          episodes={episodes}
          isExpanded={expandedChapterIds.has(chapter.id)}
          onSelectEpisode={onSelectEpisode}
          onToggle={() => onToggleChapter(chapter.id)}
        />
      ))}

      {orphanEpisodes.length > 0 && (
        <CollapsibleChapter
          activeEpisodeId={activeEpisodeId}
          chapter={{
            id: "__uncategorized__",
            courseId: orphanEpisodes[0]?.courseId ?? "",
            title: "Other Lessons",
            order: Number.MAX_SAFE_INTEGER,
          }}
          episodes={orphanEpisodes}
          isExpanded={expandedChapterIds.has("__uncategorized__")}
          onSelectEpisode={onSelectEpisode}
          onToggle={() => onToggleChapter("__uncategorized__")}
        />
      )}
    </div>
  );
}
