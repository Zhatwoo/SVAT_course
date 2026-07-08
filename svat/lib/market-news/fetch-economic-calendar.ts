import type { EconomicEvent, ImpactLevel } from "./types";

const CALENDAR_URL =
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

const VALID_IMPACTS = new Set<ImpactLevel>([
  "High",
  "Medium",
  "Low",
  "Holiday",
]);

function normalizeImpact(value: string): ImpactLevel {
  if (VALID_IMPACTS.has(value as ImpactLevel)) {
    return value as ImpactLevel;
  }
  return "Low";
}

function normalizeEvent(raw: Record<string, unknown>): EconomicEvent | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const country = typeof raw.country === "string" ? raw.country.trim() : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";

  if (!title || !country || !date) {
    return null;
  }

  return {
    title,
    country,
    date,
    impact: normalizeImpact(
      typeof raw.impact === "string" ? raw.impact : "Low",
    ),
    forecast: typeof raw.forecast === "string" ? raw.forecast : "",
    previous: typeof raw.previous === "string" ? raw.previous : "",
    actual: typeof raw.actual === "string" ? raw.actual : undefined,
  };
}

export async function fetchEconomicCalendar(): Promise<EconomicEvent[]> {
  const response = await fetch(CALENDAR_URL, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Calendar feed unavailable (${response.status})`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid calendar feed format");
  }

  return data
    .map((item) =>
      item && typeof item === "object"
        ? normalizeEvent(item as Record<string, unknown>)
        : null,
    )
    .filter((event): event is EconomicEvent => event !== null)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
}
