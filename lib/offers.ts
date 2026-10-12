import { formatPrice, site, type PricingTier } from "@/lib/site";

/**
 * The four offers a demo customer can be sent (see the pipeline plan):
 * standard price, 50% off the first month, 50% off the first year, or their
 * design files for a one-time $99. Shared by the /go-live page and checkout.
 */
export type OfferCode = "standard" | "host50-month" | "host50-year" | "files99";
export type Interval = "month" | "year";

export const OFFER_CODES: OfferCode[] = ["standard", "host50-month", "host50-year", "files99"];
export const FILES_PRICE = 99;

export const isOffer = (v: unknown): v is OfferCode => OFFER_CODES.includes(v as OfferCode);
export const tiers = site.pricing.tiers;
export const tierById = (id: string) => tiers.find((t) => t.id === id);

export type Quote = {
  /** What the first charge is, in dollars. */
  first: number;
  /** What it renews at. */
  then: number;
  /** Plain-English summary of the discount, empty for full price. */
  deal: string;
};

export function quote(tier: PricingTier, interval: Interval, offer: OfferCode): Quote {
  const price = interval === "month" ? tier.monthly : tier.yearly;
  if (offer === "host50-month") {
    const off = tier.monthly / 2;
    return interval === "month"
      ? { first: price - off, then: price, deal: "50% off your first month" }
      : { first: price - off, then: price, deal: `${formatPrice(off)} off (half of your first month)` };
  }
  if (offer === "host50-year") {
    return interval === "month"
      ? { first: price / 2, then: price, deal: "50% off every month for your first year" }
      : { first: price / 2, then: price, deal: "50% off your first year" };
  }
  return { first: price, then: price, deal: "" };
}

export const offerHeadline: Record<OfferCode, string> = {
  standard: "Get your website live",
  "host50-month": "50% off your first month",
  "host50-year": "Half-price hosting for a full year",
  files99: "Keep your design for $99",
};
