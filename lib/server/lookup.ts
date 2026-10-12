import { edge, edgeConfigured } from "@/lib/server/edge";

/** What ryzon_landing_lookup returns for a customer link token. */
export type Lookup = {
  found: boolean;
  id: string;
  first_name: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string;
  status: string;
  demo_url: string | null;
  demo_image_url: string | null;
  plan: string | null;
  offer: string | null;
  paid: boolean;
  files_url: string | null;
  timezone: string;
  offer_active: boolean | null;
  offer_reason: "unknown_offer" | "already_paid" | "not_available" | "not_started" | "expired" | null;
  offer_ends_at: string | null;
};

/** Look up a customer by the token in their email links. Null when the link is unusable. */
export async function lookup(token: string | undefined, offer?: string): Promise<Lookup | null> {
  if (!token || !/^[a-f0-9]{48}$/.test(token) || !edgeConfigured()) return null;
  try {
    const r = await edge<Lookup>("lookup", { token, offer: offer ?? null });
    return r.found ? r : null;
  } catch {
    return null;
  }
}

/** "Tuesday, October 27" in the customer's own timezone. */
export function localDate(iso: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(iso));
  }
}
