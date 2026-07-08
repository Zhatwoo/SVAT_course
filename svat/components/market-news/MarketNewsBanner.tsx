"use client";

import Link from "next/link";
import {
  formatEventClock,
  getBannerEvents,
  getEventKey,
  getEventReleaseStatus,
  getImpactDotClass,
} from "@/lib/market-news/format";
import type { EconomicEvent } from "@/lib/market-news/types";

interface MarketNewsBannerProps {
  events: EconomicEvent[];
  loading?: boolean;
}

function BannerItem({ event }: { event: EconomicEvent }) {
  const status = getEventReleaseStatus(event);

  return (
    <span className="inline-flex shrink-0 items-center gap-sm px-lg">
      <span
        className={`h-2 w-2 rounded-full ${getImpactDotClass(event.impact)}`}
      />
      <span className="font-label-sm text-label-sm font-bold uppercase tracking-wide text-secondary">
        {event.country}
      </span>
      <span className="font-body-sm text-body-sm text-on-surface">
        {event.title}
      </span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        {formatEventClock(event.date)}
      </span>
      <span
        className={`rounded-full px-sm py-px font-label-sm text-label-sm uppercase ${
          status === "released"
            ? "bg-surface-container text-on-surface-variant"
            : status === "live"
              ? "bg-tertiary-container text-on-tertiary-container"
              : "bg-secondary-container/20 text-secondary"
        }`}
      >
        {status === "released" ? "Done" : status === "live" ? "Live" : "Soon"}
      </span>
    </span>
  );
}

export default function MarketNewsBanner({
  events,
  loading = false,
}: MarketNewsBannerProps) {
  const bannerEvents = getBannerEvents(events);
  const marqueeEvents =
    bannerEvents.length > 0 ? [...bannerEvents, ...bannerEvents] : [];

  return (
    <section className="market-news-banner mb-lg overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
      <div className="flex h-11 items-stretch">
        <div className="flex shrink-0 items-center gap-sm border-r border-outline-variant bg-secondary px-md">
          <span className="material-symbols-outlined text-[18px] text-on-secondary">
            campaign
          </span>
          <span className="hidden font-label-sm text-label-sm font-bold uppercase tracking-wider text-on-secondary sm:inline">
            Market News
          </span>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center gap-sm px-lg">
              <span className="material-symbols-outlined animate-spin text-[18px] text-secondary">
                sync
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Loading market updates...
              </span>
            </div>
          ) : marqueeEvents.length > 0 ? (
            <div className="market-news-marquee-viewport h-full">
              <div className="market-news-marquee-track flex h-full w-max items-center">
                {marqueeEvents.map((event, index) => (
                  <BannerItem key={getEventKey(event, index)} event={event} />
                ))}
              </div>
            </div>
          ) : (
            <p className="flex h-full items-center px-lg font-body-sm text-body-sm text-on-surface-variant">
              No high-impact events scheduled right now. Check the full calendar
              for this week&apos;s releases.
            </p>
          )}
        </div>

        <Link
          className="flex shrink-0 items-center gap-xs border-l border-outline-variant px-md font-label-sm text-label-sm text-secondary hover:bg-surface-container"
          href="/user/market-news"
        >
          <span className="hidden sm:inline">View all</span>
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        </Link>
      </div>
    </section>
  );
}
