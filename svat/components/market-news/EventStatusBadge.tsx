import {
  getEventReleaseStatus,
  getEventStatusLabel,
  getEventStatusStyles,
  isEventStartingSoon,
} from "@/lib/market-news/format";
import type { EconomicEvent } from "@/lib/market-news/types";

export default function EventStatusBadge({ event }: { event: EconomicEvent }) {
  const status = getEventReleaseStatus(event);
  const startingSoon = status === "upcoming" && isEventStartingSoon(event);

  return (
    <span
      className={`inline-flex items-center gap-xs rounded-full px-sm py-xs font-label-sm text-label-sm font-semibold uppercase tracking-wide ${getEventStatusStyles(status)}`}
    >
      {status === "live" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary-fixed" />
      )}
      {status === "released" && (
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
      )}
      {status === "upcoming" && (
        <span className="material-symbols-outlined text-[14px]">
          {startingSoon ? "schedule" : "upcoming"}
        </span>
      )}
      {startingSoon ? "Starting soon" : getEventStatusLabel(status)}
    </span>
  );
}
