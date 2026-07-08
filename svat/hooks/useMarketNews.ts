"use client";

import { useCallback, useEffect, useState } from "react";
import type { EconomicEvent, MarketNewsResponse } from "@/lib/market-news/types";

interface UseMarketNewsResult {
  events: EconomicEvent[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  refresh: () => void;
}

export function useMarketNews(): UseMarketNewsResult {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/market-news");
      const data: MarketNewsResponse & { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load market news");
      }

      setEvents(data.events ?? []);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (err) {
      setEvents([]);
      setFetchedAt(null);
      setError(err instanceof Error ? err.message : "Failed to load market news");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    events,
    loading,
    error,
    fetchedAt,
    refresh: load,
  };
}
