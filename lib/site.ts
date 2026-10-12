import config from "@/site.config.json";

export type SiteConfig = typeof config;
export type PricingTier = SiteConfig["pricing"]["tiers"][number];
export type NavItem = SiteConfig["nav"][number];

export const site = config;

/** A config value still waiting on the owner, e.g. "[ZIP]". */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /^\[.*\]$/.test(value.trim());
}

/**
 * Absolute base URL for canonicals, the sitemap and link previews. Until [SITE_URL]
 * is set it uses the address Netlify gives the build (URL), then localhost.
 */
export const siteUrl = (isPlaceholder(config.site.url) ? process.env.SITE_URL || process.env.URL || "http://localhost:3000" : config.site.url).replace(
  /\/$/,
  "",
);

export function formatAddress(): string {
  const a = config.business.address;
  return `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
}

const usd = (digits: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
const whole = usd(0);
const cents = usd(2);

/** "$40", or "$20.50" when there are cents. */
export function formatPrice(amount: number): string {
  return (Number.isInteger(amount) ? whole : cents).format(amount);
}
