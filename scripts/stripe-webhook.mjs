/**
 * Points this site's Stripe webhook at the live domain. Netlify runs it after each
 * production build (see netlify.toml), so a domain change or a switch to live keys
 * fixes itself on the next deploy.
 *
 * Only touches endpoints this site created (metadata.source = ryzon-landing): creates
 * or re-enables the one for <site url>/api/stripe/webhook, disables the others
 * (disabled, not deleted, so it can be undone in Stripe). Never fails the build.
 */
import fs from "node:fs";

const SOURCE = "ryzon-landing";
const DESCRIPTION = "Ryzon landing: record demo payments";
const CONFIG = JSON.parse(fs.readFileSync(new URL("../site.config.json", import.meta.url), "utf8"));
// Renewal invoices only matter for affiliate commissions.
const EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded", ...(CONFIG.affiliates?.enabled ? ["invoice.paid"] : [])];

async function main() {
  if (process.env.CONTEXT && process.env.CONTEXT !== "production") return console.log("[stripe-webhook] not a production build, skipped");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return console.log("[stripe-webhook] STRIPE_SECRET_KEY not available to the build, skipped");

  const configured = CONFIG.site.url;
  const base = (/^\[.*\]$/.test(configured) ? process.env.URL : configured)?.replace(/\/$/, "");
  if (!base?.startsWith("https://")) return console.log(`[stripe-webhook] no https site URL (${base}), skipped`);
  const target = `${base}/api/stripe/webhook`;

  const call = async (method, path, params) => {
    const body = params ? new URLSearchParams(params) : undefined;
    const res = await fetch(`${process.env.STRIPE_API_BASE || "https://api.stripe.com/v1"}${path}${method === "GET" && body ? `?${body}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: method === "POST" ? body : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Stripe ${res.status}`);
    return json;
  };

  const { data } = await call("GET", "/webhook_endpoints", { limit: "100" });
  const ours = data.filter((e) => e.metadata?.source === SOURCE || e.description === DESCRIPTION);
  const current = ours.find((e) => e.url === target);

  if (!current) {
    const params = { url: target, description: DESCRIPTION, "metadata[source]": SOURCE };
    EVENTS.forEach((ev, i) => (params[`enabled_events[${i}]`] = ev));
    const created = await call("POST", "/webhook_endpoints", params);
    console.log(`[stripe-webhook] created ${created.id} -> ${target}`);
  } else if (current.status !== "enabled") {
    await call("POST", `/webhook_endpoints/${current.id}`, { disabled: "false" });
    console.log(`[stripe-webhook] re-enabled ${current.id} -> ${target}`);
  } else if (!EVENTS.every((ev) => current.enabled_events?.includes(ev) || current.enabled_events?.includes("*"))) {
    const params = {};
    EVENTS.forEach((ev, i) => (params[`enabled_events[${i}]`] = ev));
    await call("POST", `/webhook_endpoints/${current.id}`, params);
    console.log(`[stripe-webhook] updated events on ${current.id}: ${EVENTS.join(", ")}`);
  } else {
    console.log(`[stripe-webhook] ok: ${current.id} -> ${target}`);
  }

  for (const e of ours) {
    if (e.url === target || e.status !== "enabled") continue;
    await call("POST", `/webhook_endpoints/${e.id}`, { disabled: "true" });
    console.log(`[stripe-webhook] disabled old ${e.id} (${e.url})`);
  }
}

main().catch((e) => console.log(`[stripe-webhook] skipped: ${e.message}`));
