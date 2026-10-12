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
