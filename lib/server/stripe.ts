/**
 * Minimal Stripe REST client for checkout. Server-only: reads STRIPE_SECRET_KEY.
 * Prices and coupons are created on first use (found again by lookup key / id),
 * so a fresh Stripe account needs no manual setup.
 */
import { tierById, type Interval, type OfferCode } from "@/lib/offers";
import { edge } from "@/lib/server/edge";

const API = "https://api.stripe.com/v1";
/** Marks sessions as ours: the Stripe account may also serve other sites. */
export const SOURCE = "ryzon-landing";

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Params = Record<string, unknown>;

function encode(params: Params, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item as Params, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") encode(v as Params, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe<T>(method: "GET" | "POST", path: string, params: Params = {}, idempotencyKey?: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError("Stripe is not configured", 503);
  const body = encode(params);
  const url = method === "GET" && [...body].length ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new StripeError(json.error?.message || `Stripe ${res.status}`, res.status);
  return json;
}

// ---------------------------------------------------------------- catalog

type Price = { id: string };

const priceCache = new Map<string, string>();

async function ensurePrice(lookupKey: string, spec: { name: string; cents: number; interval?: Interval }) {
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;
  const found = await stripe<{ data: Price[] }>("GET", "/prices", { lookup_keys: [lookupKey], active: true, limit: 1 });
  let id = found.data[0]?.id;
  if (!id) {
    const created = await stripe<Price>(
      "POST",
      "/prices",
      {
        currency: "usd",
        unit_amount: spec.cents,
        lookup_key: lookupKey,
        recurring: spec.interval ? { interval: spec.interval } : undefined,
        product_data: { name: spec.name, metadata: { source: SOURCE } },
        metadata: { source: SOURCE },
      },
      `ryzon-price-${lookupKey}`,
    );
    id = created.id;
  }
  priceCache.set(lookupKey, id);
  return id;
}

/** The plan price for a tier and interval, or the one-time $99 design files price. */
export function priceFor(plan: string, interval: Interval | "once") {
  if (plan === "files99") return ensurePrice("ryzon_files99", { name: "Ryzon design files (one-time)", cents: 9900 });
  const tier = tierById(plan);
  if (!tier || interval === "once") throw new StripeError("Unknown plan", 400);
  const dollars = interval === "month" ? tier.monthly : tier.yearly;
  return ensurePrice(`ryzon_${tier.id}_${interval}`, { name: `Ryzon ${tier.name} (${interval === "month" ? "monthly" : "yearly"})`, cents: dollars * 100, interval });
}

type CouponSpec = { id: string; name: string; percent_off?: number; amount_off?: number; duration: "once" | "repeating"; duration_in_months?: number };

const couponReady = new Set<string>();

async function ensureCoupon(spec: CouponSpec) {
  if (couponReady.has(spec.id)) return spec.id;
  try {
    await stripe("GET", `/coupons/${encodeURIComponent(spec.id)}`);
  } catch (e) {
    if (!(e instanceof StripeError) || e.status !== 404) throw e;
    await stripe("POST", "/coupons", { ...spec, currency: spec.amount_off ? "usd" : undefined, metadata: { source: SOURCE } }, `ryzon-coupon-${spec.id}`);
  }
  couponReady.add(spec.id);
  return spec.id;
}

/** Coupon for an offer on a given plan and billing interval, if the offer has one. */
export function couponFor(offer: OfferCode, plan: string, interval: Interval) {
  const tier = tierById(plan);
  if (!tier) return null;
  if (offer === "host50-month") {
    return interval === "month"
      ? ensureCoupon({ id: "ryzon-host50-month", name: "50% off first month", percent_off: 50, duration: "once" })
      : ensureCoupon({ id: `ryzon-host50-month-${tier.id}-yearly`, name: "Half of first month off", amount_off: tier.monthly * 50, duration: "once" });
  }
  if (offer === "host50-year") {
    return interval === "month"
      ? ensureCoupon({ id: "ryzon-host50-year-monthly", name: "50% off first 12 months", percent_off: 50, duration: "repeating", duration_in_months: 12 })
      : ensureCoupon({ id: "ryzon-host50-year-yearly", name: "50% off first year", percent_off: 50, duration: "once" });
  }
  return null;
}

// ---------------------------------------------------------------- checkout

export type CheckoutInput = {
  submissionId: string;
  token: string;
  email: string;
  offer: OfferCode;
  plan: string;
  interval: Interval | "once";
  origin: string;
};

export async function createCheckout(input: CheckoutInput) {
  const { submissionId, token, email, offer, plan, interval, origin } = input;
  const metadata = { source: SOURCE, submission_id: submissionId, token, offer, plan, interval };
  const common = {
    client_reference_id: submissionId,
    customer_email: email,
    metadata,
    success_url: `${origin}/go-live/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/go-live?t=${encodeURIComponent(token)}&offer=${offer}`,
  };
  const price = await priceFor(plan, interval);
  if (offer === "files99") {
    return stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
      ...common,
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      payment_intent_data: { metadata },
    });
  }
  const coupon = interval === "once" ? null : await couponFor(offer, plan, interval);
  return stripe<{ id: string; url: string }>("POST", "/checkout/sessions", {
    ...common,
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    discounts: coupon ? [{ coupon }] : undefined,
    subscription_data: { metadata },
  });
}

type Session = {
  id: string;
  status: string;
  payment_status: string;
  amount_total: number | null;
  currency: string | null;
  customer: string | null;
  subscription: string | null;
  metadata: Record<string, string> | null;
};

export const retrieveSession = (id: string) => stripe<Session>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);

export type Recorded = { recorded: boolean; duplicate?: boolean; token?: string; offer?: string; reason?: string };

/** Save a completed checkout to Supabase. Safe to call twice for the same session. */
export async function recordSession(s: Session): Promise<Recorded> {
  const m = s.metadata ?? {};
  if (m.source !== SOURCE || !m.submission_id) return { recorded: false, reason: "not_ours" };
  if (s.status !== "complete" || !["paid", "no_payment_required"].includes(s.payment_status)) return { recorded: false, reason: "unpaid", token: m.token };
  const res = await edge<{ duplicate: boolean }>("record_payment", {
    data: {
      submission_id: m.submission_id,
      token: m.token,
      stripe_session_id: s.id,
      stripe_customer_id: s.customer ?? "",
      stripe_subscription_id: s.subscription ?? "",
      product: m.plan,
      billing_interval: m.interval,
      offer_code: m.offer,
      amount_total: s.amount_total,
      currency: s.currency,
    },
  });
  return { recorded: true, duplicate: res.duplicate, token: m.token, offer: m.offer };
}

// ---------------------------------------------------------------- webhook

export async function retrieveEvent(id: string) {
  return stripe<{ id: string; type: string; data: { object: Session } }>("GET", `/events/${encodeURIComponent(id)}`);
}

/** Registers the webhook endpoint once and warms the prices and coupons. */
export async function setup(origin: string) {
  const url = `${origin}/api/stripe/webhook`;
  const events = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
  const list = await stripe<{ data: { id: string; url: string; status: string }[] }>("GET", "/webhook_endpoints", { limit: 100 });
  let endpoint = list.data.find((e) => e.url === url);
  if (!endpoint) {
    endpoint = await stripe("POST", "/webhook_endpoints", { url, enabled_events: events, description: "Ryzon landing: record demo payments", metadata: { source: SOURCE } });
  }
  const prices = await Promise.all(
    [...["starter", "growth", "complete"].flatMap((p) => [priceFor(p, "month"), priceFor(p, "year")]), priceFor("files99", "once")],
  );
  const coupons = await Promise.all(
    ["starter", "growth", "complete"].flatMap((p) => [couponFor("host50-month", p, "month"), couponFor("host50-month", p, "year"), couponFor("host50-year", p, "month"), couponFor("host50-year", p, "year")]),
  );
  return { webhook: { id: endpoint!.id, url }, prices: prices.length, coupons: [...new Set(coupons)].length };
}
