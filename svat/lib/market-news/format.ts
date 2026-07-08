import type { EconomicEvent, EventReleaseStatus, ImpactLevel } from "./types";

export type { EventReleaseStatus } from "./types";
const LIVE_WINDOW_MS = 30 * 60 * 1000;
const SOON_WINDOW_MS = 60 * 60 * 1000;

export function getEventReleaseStatus(event: EconomicEvent): EventReleaseStatus {
  const eventTime = new Date(event.date).getTime();
  if (Number.isNaN(eventTime)) {
    return "upcoming";
  }

  const now = Date.now();

  if (event.actual?.trim()) {
    return "released";
  }

  if (eventTime > now) {
    return "upcoming";
  }

  if (now - eventTime <= LIVE_WINDOW_MS) {
    return "live";
  }

  return "released";
}

export function getEventStatusLabel(status: EventReleaseStatus): string {
  switch (status) {
    case "released":
      return "Released";
    case "live":
      return "Live";
    default:
      return "Upcoming";
  }
}

export function getEventStatusStyles(status: EventReleaseStatus): string {
  switch (status) {
    case "released":
      return "bg-surface-container text-on-surface-variant";
    case "live":
      return "bg-tertiary-container text-on-tertiary-container";
    default:
      return "bg-secondary-container/20 text-secondary";
  }
}

export function isEventStartingSoon(event: EconomicEvent): boolean {
  const eventTime = new Date(event.date).getTime();
  if (Number.isNaN(eventTime)) {
    return false;
  }

  const diff = eventTime - Date.now();
  return diff > 0 && diff <= SOON_WINDOW_MS;
}

export function getEventKey(event: EconomicEvent, index?: number): string {
  const base = `${event.country}-${event.title}-${event.date}`;
  return index === undefined ? base : `${base}-${index}`;
}

export function formatEventTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatEventDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatEventClock(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function getImpactStyles(impact: ImpactLevel): string {
  switch (impact) {
    case "High":
      return "bg-error-container text-on-error-container";
    case "Medium":
      return "bg-tertiary-fixed text-on-tertiary-fixed-variant";
    case "Holiday":
      return "bg-surface-container-highest text-on-surface-variant";
    default:
      return "bg-surface-container text-on-surface-variant";
  }
}

export function getImpactDotClass(impact: ImpactLevel): string {
  switch (impact) {
    case "High":
      return "bg-error";
    case "Medium":
      return "bg-tertiary";
    case "Holiday":
      return "bg-outline";
    default:
      return "bg-outline-variant";
  }
}

export function isUpcomingEvent(event: EconomicEvent): boolean {
  const eventTime = new Date(event.date).getTime();
  if (Number.isNaN(eventTime)) {
    return false;
  }

  return eventTime >= Date.now() - 60 * 60 * 1000;
}

export function getBannerEvents(events: EconomicEvent[]): EconomicEvent[] {
  return events
    .filter(
      (event) =>
        isUpcomingEvent(event) &&
        (event.impact === "High" || event.impact === "Medium"),
    )
    .slice(0, 12);
}

export function groupEventsByDate(
  events: EconomicEvent[],
): { dateKey: string; label: string; events: EconomicEvent[] }[] {
  const groups = new Map<string, EconomicEvent[]>();

  for (const event of events) {
    const date = new Date(event.date);
    const dateKey = Number.isNaN(date.getTime())
      ? "unknown"
      : date.toISOString().slice(0, 10);

    const existing = groups.get(dateKey) ?? [];
    existing.push(event);
    groups.set(dateKey, existing);
  }

  return Array.from(groups.entries()).map(([dateKey, groupedEvents]) => ({
    dateKey,
    label:
      dateKey === "unknown"
        ? "Unknown date"
        : formatEventDate(groupedEvents[0].date),
    events: groupedEvents,
  }));
}
