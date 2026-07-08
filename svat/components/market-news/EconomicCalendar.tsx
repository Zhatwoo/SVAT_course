"use client";

import EventStatusBadge from "@/components/market-news/EventStatusBadge";
import { useMemo, useState } from "react";
import {
  formatEventClock,
  getEventKey,
  getEventReleaseStatus,
  getEventStatusLabel,
  getImpactStyles,
  groupEventsByDate,
} from "@/lib/market-news/format";
import type { EconomicEvent, EventReleaseStatus, ImpactLevel } from "@/lib/market-news/types";

const IMPACT_FILTERS: Array<ImpactLevel | "All"> = [
  "All",
  "High",
  "Medium",
  "Low",
  "Holiday",
];

const CURRENCY_FILTERS = [
  "All",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "CNY",
] as const;

const STATUS_FILTERS: Array<EventReleaseStatus | "All"> = [
  "All",
  "upcoming",
  "live",
  "released",
];

interface EconomicCalendarProps {
  events: EconomicEvent[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export default function EconomicCalendar({
  events,
  loading = false,
  error = null,
  onRefresh,
}: EconomicCalendarProps) {
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | "All">("All");
  const [currencyFilter, setCurrencyFilter] =
    useState<(typeof CURRENCY_FILTERS)[number]>("All");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>("All");

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesImpact =
        impactFilter === "All" || event.impact === impactFilter;
      const matchesCurrency =
        currencyFilter === "All" || event.country === currencyFilter;
      const matchesStatus =
        statusFilter === "All" ||
        getEventReleaseStatus(event) === statusFilter;
      return matchesImpact && matchesCurrency && matchesStatus;
    });
  }, [currencyFilter, events, impactFilter, statusFilter]);

  const groupedEvents = useMemo(
    () => groupEventsByDate(filteredEvents),
    [filteredEvents],
  );

  if (loading) {
    return (
      <div className="card-flat flex items-center justify-center gap-sm p-xl">
        <span className="material-symbols-outlined animate-spin text-secondary">
          sync
        </span>
        <span className="font-body-md text-body-md text-on-surface-variant">
          Loading economic calendar...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error-container bg-error-container px-lg py-md text-on-error-container">
        <p className="font-body-md text-body-md">{error}</p>
        {onRefresh && (
          <button
            className="mt-sm font-label-md text-label-md text-secondary underline"
            onClick={onRefresh}
            type="button"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-lg">
      <div className="card-flat p-lg">
        <div className="flex flex-col gap-md lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary">
              Economic Calendar
            </h2>
            <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
              High-impact releases and macro events for this week. Status shows
              if a release is upcoming, live, or already released.
            </p>
          </div>

          <div className="flex flex-wrap gap-sm">
            {IMPACT_FILTERS.map((impact) => (
              <button
                key={impact}
                className={`rounded-full px-md py-xs font-label-sm text-label-sm transition-colors ${
                  impactFilter === impact
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
                onClick={() => setImpactFilter(impact)}
                type="button"
              >
                {impact}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-md flex flex-wrap items-center gap-sm">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
            Status
          </span>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              className={`rounded-full px-md py-xs font-label-sm text-label-sm capitalize transition-colors ${
                statusFilter === status
                  ? "bg-secondary text-on-secondary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
              onClick={() => setStatusFilter(status)}
              type="button"
            >
              {status === "All" ? "All" : getEventStatusLabel(status)}
            </button>
          ))}
        </div>

        <div className="mt-md flex flex-wrap gap-sm">
          {CURRENCY_FILTERS.map((currency) => (
            <button
              key={currency}
              className={`rounded-lg border px-sm py-xs font-label-sm text-label-sm transition-colors ${
                currencyFilter === currency
                  ? "border-secondary bg-surface-container-high text-secondary"
                  : "border-outline-variant text-on-surface-variant hover:border-secondary"
              }`}
              onClick={() => setCurrencyFilter(currency)}
              type="button"
            >
              {currency}
            </button>
          ))}
        </div>
      </div>

      {groupedEvents.length === 0 ? (
        <div className="card-flat p-xl text-center">
          <span className="material-symbols-outlined mb-sm text-[40px] text-outline">
            event_busy
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant">
            No events match your filters.
          </p>
        </div>
      ) : (
        groupedEvents.map((group) => (
          <section key={group.dateKey} className="card-flat overflow-hidden">
            <div className="border-b border-outline-variant bg-surface-container-low px-lg py-md">
              <h3 className="font-label-md text-label-md font-bold text-primary">
                {group.label}
              </h3>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-0 text-left">
                <thead className="border-b border-outline-variant bg-surface-container-low">
                  <tr>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Time
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Currency
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Impact
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Event
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Forecast
                    </th>
                    <th className="px-lg py-md font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                      Previous
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {group.events.map((event, index) => {
                    const status = getEventReleaseStatus(event);

                    return (
                    <tr
                      key={getEventKey(event, index)}
                      className={`zebra-row ${status === "released" ? "opacity-70" : ""}`}
                    >
                      <td className="px-lg py-md">
                        <EventStatusBadge event={event} />
                      </td>
                      <td className="px-lg py-md font-body-sm text-body-sm whitespace-nowrap">
                        {formatEventClock(event.date)}
                      </td>
                      <td className="px-lg py-md font-label-md text-label-md font-bold">
                        {event.country}
                      </td>
                      <td className="px-lg py-md">
                        <span
                          className={`rounded px-sm py-xs font-label-sm text-label-sm font-bold uppercase ${getImpactStyles(event.impact)}`}
                        >
                          {event.impact}
                        </span>
                      </td>
                      <td className="px-lg py-md font-body-md text-body-md font-semibold break-words">
                        {event.title}
                      </td>
                      <td className="px-lg py-md font-body-sm text-body-sm text-on-surface-variant">
                        {event.forecast || "—"}
                      </td>
                      <td className="px-lg py-md font-body-sm text-body-sm text-on-surface-variant">
                        {event.previous || "—"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
