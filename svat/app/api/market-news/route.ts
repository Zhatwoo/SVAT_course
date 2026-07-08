import { NextResponse } from "next/server";
import { fetchEconomicCalendar } from "@/lib/market-news/fetch-economic-calendar";
import type { MarketNewsResponse } from "@/lib/market-news/types";

export const revalidate = 300;

export async function GET() {
  try {
    const events = await fetchEconomicCalendar();
    const payload: MarketNewsResponse = {
      events,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load market news";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
