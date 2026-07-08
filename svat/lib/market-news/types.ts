export type ImpactLevel = "High" | "Medium" | "Low" | "Holiday";

export type EventReleaseStatus = "released" | "live" | "upcoming";

export interface EconomicEvent {
  title: string;
  country: string;
  date: string;
  impact: ImpactLevel;
  forecast: string;
  previous: string;
  actual?: string;
}

export interface MarketNewsResponse {
  events: EconomicEvent[];
  fetchedAt: string;
}
