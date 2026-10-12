import { site, isPlaceholder } from "@/lib/site";

/** Conversion events the funnel reports. */
export type AnalyticsEvent =
  | { name: "cta_click"; location: string; label?: string; href?: string }
  | { name: "demo_submit"; step?: number }
  | { name: "contact_submit" };

type DataLayerWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  gtag?: (...args: unknown[]) => void;
};

export const analyticsId = site.site.analyticsId;
export const analyticsEnabled = !isPlaceholder(analyticsId);

/**
 * Provider-agnostic event helper. Pushes to window.dataLayer (GTM, GA4 via
 * gtag, and most tag managers read it) and calls gtag when present.
 * Safe to call before any provider loads.
 */
export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  const { name, ...params } = event;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event: name, ...params });
  if (typeof w.gtag === "function") w.gtag("event", name, params);
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, params);
  }
}
