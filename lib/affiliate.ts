/**
 * Affiliate tracking. An affiliate's link is /a/<code> (or any page with ?aff=<code>).
 * Opening it logs a click and keeps the code on the visitor's device in first-party cookies
 * for the program's window (set in the dashboard, 60 days to start):
 *
 *   rz_aff        last touch      "<code>.<unix seconds>"
 *   rz_aff_first  first touch     same format, never overwritten while it lasts
 *   rz_aff_hist   last 10 touches "<code>.<secs>|<code>.<secs>|..."
 *   rz_vid        random visitor id, so repeat clicks count once
 *
 * The cookies are httpOnly: only the server reads them, when a form is sent (/api/lead),
 * and the database decides who gets the credit (last click inside the window, active
 * affiliates only, never the person filling in the form). See migration 13.
 *
 * Everything here is off until site.config.json affiliates.enabled is true
 * (AFFILIATES_PREVIEW=1 turns it on locally for testing).
 */
import { PUBLIC_API, publicHeaders } from "@/lib/publicApi";
import { site } from "@/lib/site";

export const AFFILIATE_CODE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const AFF_COOKIES = { last: "rz_aff", first: "rz_aff_first", history: "rz_aff_hist", visitor: "rz_vid" } as const;
const HISTORY_MAX = 10;

export function affiliatesEnabled(): boolean {
  return site.affiliates.enabled || process.env.AFFILIATES_PREVIEW === "1";
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toLowerCase();
  return c.length >= 3 && c.length <= 40 && AFFILIATE_CODE.test(c) ? c : null;
}

type Touch = { c: string; t: number };

function parseTouch(v: string | undefined): Touch | null {
  if (!v) return null;
  const [c, t] = v.split(".");
  const code = normalizeCode(c);
  const secs = Number(t);
  return code && Number.isInteger(secs) && secs > 0 ? { c: code, t: secs } : null;
}

const formatTouch = (x: Touch) => `${x.c}.${x.t}`;

function parseHistory(v: string | undefined): Touch[] {
  return (v ?? "")
    .split("|")
    .map((part) => parseTouch(part))
    .filter((x): x is Touch => x !== null)
    .slice(-HISTORY_MAX);
}

type CookieGet = (name: string) => string | undefined;
type CookieSet = (name: string, value: string, options: { maxAge: number; httpOnly: boolean; secure: boolean; sameSite: "lax"; path: string }) => void;

const iso = (secs: number) => new Date(secs * 1000).toISOString();

/** What a form sends the database about the visitor's affiliate history (null when there is none). */
export function affiliatePayload(get: CookieGet) {
  const last = parseTouch(get(AFF_COOKIES.last));
  const first = parseTouch(get(AFF_COOKIES.first));
  const history = parseHistory(get(AFF_COOKIES.history));
  if (!last && !first && history.length === 0) return null;
  return {
    code: last?.c ?? "",
    clicked_at: last ? iso(last.t) : "",
    first_code: first?.c ?? "",
    first_at: first ? iso(first.t) : "",
    touches: history.map((x) => ({ c: x.c, t: iso(x.t) })),
  };
}

/** Writes the touch cookies for a valid code. */
export function writeTouch(get: CookieGet, set: CookieSet, code: string, days: number, secure: boolean) {
  const now = Math.floor(Date.now() / 1000);
  const touch = { c: code, t: now };
  const opts = { maxAge: days * 86_400, httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
  set(AFF_COOKIES.last, formatTouch(touch), opts);
  if (!parseTouch(get(AFF_COOKIES.first))) set(AFF_COOKIES.first, formatTouch(touch), opts);
  set(AFF_COOKIES.history, [...parseHistory(get(AFF_COOKIES.history)), touch].slice(-HISTORY_MAX).map(formatTouch).join("|"), opts);
}

/** The visitor id cookie, created when missing. */
export function visitorId(get: CookieGet): { id: string; isNew: boolean } {
  const v = get(AFF_COOKIES.visitor);
  if (v && /^[a-f0-9]{32}$/.test(v)) return { id: v, isNew: false };
  return { id: crypto.randomUUID().replace(/-/g, ""), isNew: true };
}

async function rpc<T>(fn: string, args: Record<string, unknown>, init?: RequestInit): Promise<T | null> {
  const res = await fetch(`${PUBLIC_API}/rpc/${fn}`, {
    method: "POST",
    headers: { ...publicHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(4_000),
    ...init,
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T | null) : null;
}

/**
 * Logs a click. Returns the cookie window in days for an active code, null for an
 * unknown or paused one, and undefined when the database couldn't be reached (the site
 * then keeps the code anyway; the database checks it again when a form is sent).
 */
export async function recordClick(code: string, visitor: string, path: string, referrerHost: string): Promise<number | null | undefined> {
  try {
    const days = await rpc<number>(
      "ryzon_landing_affiliate_click",
      { p_code: code, p_visitor: visitor, p_path: path.slice(0, 300), p_referrer: referrerHost.slice(0, 200) },
      { cache: "no-store" },
    );
    return typeof days === "number" && days > 0 ? days : null;
  } catch (e) {
    console.warn(`[affiliate] click not logged (${(e as Error).message})`);
    return undefined;
  }
}

/** Records a visit and sets the cookies. Shared by /a/<code> and ?aff=<code>. */
export async function track(get: CookieGet, set: CookieSet, rawCode: unknown, path: string, referrer: string | null, secure: boolean) {
  const code = normalizeCode(rawCode);
  if (!code) return false;
  const visitor = visitorId(get);
  let host = "";
  try {
    host = referrer ? new URL(referrer).host : "";
  } catch {}
  const days = await recordClick(code, visitor.id, path, host);
  if (days === null) return false;
  const window = days ?? site.affiliates.cookieDays;
  if (visitor.isNew) set(AFF_COOKIES.visitor, visitor.id, { maxAge: 400 * 86_400, httpOnly: true, secure, sameSite: "lax", path: "/" });
  writeTouch(get, set, code, window, secure);
  return true;
}

export type AffiliateTerms = { cookie_days: number; rate_hosting: number; rate_design: number; hosting_months: number };

/** The live program terms from the dashboard settings, falling back to site.config.json. */
export async function getAffiliateTerms(): Promise<AffiliateTerms> {
  const fallback = { cookie_days: site.affiliates.cookieDays, rate_hosting: site.affiliates.hostingRate, rate_design: site.affiliates.designRate, hosting_months: site.affiliates.hostingMonths };
  try {
    const t = await rpc<AffiliateTerms>("ryzon_landing_affiliate_terms", {}, { next: { revalidate: 300, tags: ["affiliate-terms"] } });
    return t && typeof t.cookie_days === "number" ? { ...fallback, ...t } : fallback;
  } catch (e) {
    console.warn(`[affiliate] terms lookup failed (${(e as Error).message})`);
    return fallback;
  }
}

export async function applyAffiliate(data: Record<string, string>): Promise<void> {
  await rpc("ryzon_landing_affiliate_apply", { p: data }, { cache: "no-store" });
}
