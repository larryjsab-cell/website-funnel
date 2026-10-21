/**
 * Where a visitor came from, sent with every form so each lead in the dashboard
 * shows its source. UTM tags are kept for the session, so they survive the visitor
 * scrolling or clicking anchors before they submit.
 */
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const KEY = "rz-attribution";

type Attribution = Partial<Record<(typeof UTM)[number] | "referrer" | "landing_page", string>>;

function read(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}") as Attribution;
  } catch {
    return {};
  }
}

// A referral link (/r/<code>) is remembered for 30 days, so a visitor who comes back
// later on their own still counts for the person who sent them.
const REF_KEY = "rz-referral";
const REF_DAYS = 30;

function storedReferral(): string | null {
  try {
    const r = JSON.parse(localStorage.getItem(REF_KEY) || "null") as { code?: string; at?: number } | null;
    if (r?.code && typeof r.at === "number" && Date.now() - r.at < REF_DAYS * 86_400_000) return r.code;
  } catch {
    // Storage blocked: the current session still carries the tags.
  }
  return null;
}

const referralTags = (code: string): Attribution => ({ utm_source: "referral", utm_medium: "referrer", utm_campaign: code });

/** Called by the referral page. A referral link outranks earlier tags in this session. */
export function setReferral(code: string) {
  if (typeof window === "undefined") return;
  const saved = read();
  const next: Attribution = { ...saved, utm_term: undefined, utm_content: undefined, ...referralTags(code) };
  if (!saved.landing_page) next.landing_page = window.location.pathname;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: nothing to keep.
  }
  try {
    localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // Storage blocked.
  }
}

/** Record first-touch details once per session. Safe to call more than once. */
export function rememberAttribution() {
  if (typeof window === "undefined") return;
  const saved = read();
  const params = new URLSearchParams(window.location.search);
  const next: Attribution = { ...saved };
  for (const k of UTM) {
    const v = params.get(k);
    if (v && !saved[k]) next[k] = v.slice(0, 200);
  }
  const referral = !next.utm_source && storedReferral();
  if (referral) Object.assign(next, referralTags(referral));
  if (!saved.landing_page) next.landing_page = window.location.pathname + window.location.search;
  const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
  if (ref && !saved.referrer) next.referrer = ref.slice(0, 500);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: fall back to what the current URL says at submit time.
  }
}

export function attribution(): Attribution & { timezone: string } {
  rememberAttribution();
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    timezone = "";
  }
  const saved = read();
  const params = new URLSearchParams(window.location.search);
  const out: Attribution & { timezone: string } = { ...saved, timezone };
  for (const k of UTM) if (!out[k] && params.get(k)) out[k] = params.get(k)!.slice(0, 200);
  return out;
}
