import config from "@/site.config.json";

export type SiteConfig = typeof config;
export type PricingTier = SiteConfig["pricing"]["tiers"][number];
export type NavItem = SiteConfig["nav"][number];

export const site = config;

/** A config value still waiting on the owner, e.g. "[ZIP]". */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /^\[.*\]$/.test(value.trim());
}

/** Absolute base URL. Falls back to localhost until [SITE_URL] is set. */
export const siteUrl = isPlaceholder(config.site.url)
  ? "http://localhost:3000"
  : config.site.url.replace(/\/$/, "");

export function formatAddress(): string {
  const a = config.business.address;
  return `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
}

export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
