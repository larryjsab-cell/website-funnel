// Phase 12 sweep: console errors/warnings + CSP violations on every page and state,
// security headers, internal links and anchors, CTA destinations, 404 page, metadata uniqueness.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { mockSupabase } from "./mocks.mjs";
const B = "http://localhost:3000";
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const row = (k, v) => console.log(String(k).padEnd(50), v);

// ---- headers
const res = await fetch(B + "/");
const want = ["content-security-policy", "strict-transport-security", "x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy"];
const missing = want.filter((h) => !res.headers.get(h));
row("security headers on /", missing.length ? `MISSING ${missing}` : `all ${want.length} present`);
if (missing.length) problems.push(`headers missing: ${missing}`);
for (const path of ["/api/lead", "/llms.txt", "/robots.txt", "/opengraph-image", `/go-live?t=${T.review}`]) {
  const r = await fetch(B + path, { method: path === "/api/lead" ? "POST" : "GET", headers: { "content-type": "application/json" }, body: path === "/api/lead" ? "{}" : undefined, redirect: "manual" });
  if (!r.headers.get("content-security-policy")) problems.push(`no CSP on ${path}`);
}

// ---- pages and states
const pages = [
  "/", "/?style=luxury", "/?style=playful", "/privacy", "/terms", "/nope", "/llms.txt",
  `/go-live?t=${T.review}&offer=standard`, `/go-live?t=${T.review}&offer=host50-year`, `/go-live?t=${T.files}&offer=files99`, `/go-live?t=${T.paid}`, `/go-live?t=${T.closed}`, "/go-live?t=bad",
  `/go-live/success?t=${T.paid}`, `/changes?t=${T.paid}`, `/changes?t=${T.review}`, `/book?t=${T.paid}`, "/book", "/book?purpose=launch",
  `/unsubscribe?t=${T.review}`, `/unsubscribe?t=${T.review}&done=1`, "/unsubscribe?error=1",
  "/thank-you", "/thank-you?form=contact", "/thank-you?error=validation&fields=phone:phone", "/thank-you?error=upstream",
  "/admin", "/admin?view=board", "/admin?view=table", "/admin/s/s1",
];
const links = new Map(); // href -> first page seen
const meta = [];
// Chrome logs a document's own 404 status as a console error; /nope must return 404.
const allowedConsole = [];
const expected404 = (path, text) => path === "/nope" && /status of 404/.test(text);
for (const width of [1280, 375]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  for (const path of pages) {
    const p = await ctx.newPage();
    if (path.startsWith("/admin")) {
      await mockSupabase(p);
      await p.addInitScript(() => {
        const s = { access_token: "x", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r", user: { id: "u1", aud: "authenticated", role: "authenticated", email: "larryjsab@gmail.com" } };
        localStorage.setItem("sb-woejhqidgykrcdyktuio-auth-token", JSON.stringify(s));
      });
    }
    const logs = [];
    p.on("console", (m) => ["error", "warning"].includes(m.type()) && !expected404(path, m.text()) && logs.push(`${m.type()}: ${m.text().slice(0, 160)}`));
    p.on("pageerror", (e) => logs.push(`pageerror: ${e.message.slice(0, 160)}`));
    // Next.js Link prefetches (?_rsc=) are aborted when the test closes the page; that isn't a page error.
    p.on("requestfailed", (r) => !r.url().includes("supabase.co") && !(r.url().includes("_rsc=") && r.failure()?.errorText === "net::ERR_ABORTED") && logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    p.on("response", (r) => r.status() >= 400 && !r.url().endsWith("/nope") && logs.push(`http ${r.status()}: ${r.url()}`));
    await p.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`)));
    await p.goto(B + path, { waitUntil: "networkidle" });
    // Scroll through so lazy content, observers and images all run.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(400);
    if (logs.length) problems.push(`${path}@${width}: ${[...new Set(logs)].join(" | ")}`);
    if (width === 1280 && !path.endsWith(".txt")) {
      const info = await p.evaluate(() => ({
        hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
        title: document.title,
        desc: document.querySelector('meta[name="description"]')?.content ?? "",
        ogTitle: document.querySelector('meta[property="og:title"]')?.content ?? "",
        ogDesc: document.querySelector('meta[property="og:description"]')?.content ?? "",
      }));
      for (const h of info.hrefs) if (!links.has(h)) links.set(h, path);
      meta.push({ path, ...info });
    }
    await p.close();
  }
  await ctx.close();
}
row("pages × widths checked for console/CSP/HTTP errors", pages.length * 2);

// ---- links
const internal = [...links.keys()].filter((h) => h.startsWith("/") || h.startsWith("#"));
const external = [...links.keys()].filter((h) => /^https?:/.test(h));
const other = [...links.keys()].filter((h) => !internal.includes(h) && !external.includes(h));
row("unique hrefs", `${links.size} (internal ${internal.length}, external ${external.length}, other ${other.length})`);
const ids = new Map();
async function idsOn(pathname) {
  if (!ids.has(pathname)) {
    const html = await (await fetch(B + pathname)).text();
    ids.set(pathname, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(pathname);
}
for (const h of internal) {
  const from = links.get(h);
  const u = new URL(h, B + from);
  const r = await fetch(u.origin + u.pathname + u.search, { redirect: "manual" });
  const okStatus = r.status < 400 || (u.pathname === "/nope");
  if (!okStatus) problems.push(`broken link ${h} (on ${from}): ${r.status}`);
  if (u.hash && u.hash !== "#") {
    const set = await idsOn(u.pathname);
    if (!set.has(decodeURIComponent(u.hash.slice(1)))) problems.push(`missing anchor ${h} (on ${from})`);
  }
}
row("internal links + anchors resolved", internal.length);
row("external links", external.join(" , ") || "none");
row("other schemes", other.join(" , "));
for (const h of other) if (!/^(mailto:larryjsab@gmail\.com|tel:\+12489744220)/.test(h)) problems.push(`unexpected href ${h}`);

// ---- CTAs
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const CTA = /free demo|free design|design like this|start my/i;
  const report = [];
  for (const path of ["/", "/privacy", "/terms", "/nope"]) {
    await p.goto(B + path, { waitUntil: "networkidle" });
    const ctas = await p.evaluate((src) => {
      const re = new RegExp(src, "i");
      return [...document.querySelectorAll("a[href]")].filter((a) => re.test(a.textContent)).map((a) => ({ text: a.textContent.trim().replace(/\s+/g, " "), href: a.getAttribute("href") }));
    }, CTA.source);
    for (const c of ctas) if (!/^\/?#demo$/.test(c.href)) problems.push(`CTA "${c.text}" on ${path} goes to ${c.href}`);
    report.push(`${path}: ${ctas.length}`);
    // Click each distinct CTA and confirm the demo form ends up in view.
    const n = ctas.length;
    for (let i = 0; i < n; i++) {
      await p.goto(B + path, { waitUntil: "networkidle" });
      const a = p.locator("a[href]").filter({ hasText: CTA }).nth(i);
      if (!(await a.isVisible())) continue;
      await a.click();
      await p.waitForTimeout(900);
      const inView = await p.evaluate(() => {
        const r = document.getElementById("demo")?.getBoundingClientRect();
        return !!r && r.top < window.innerHeight && r.bottom > 0 && location.pathname === "/";
      });
      if (!inView) problems.push(`CTA #${i} on ${path} did not land on the demo form`);
    }
  }
  row("demo CTAs per page (all → /#demo, clicked)", report.join(" | "));
  // Mobile bar CTA
  const m = await browser.newContext({ viewport: { width: 375, height: 800 } });
  const mp = await m.newPage();
  await mp.goto(B + "/", { waitUntil: "networkidle" });
  await mp.evaluate(() => window.scrollTo(0, 1600));
  await mp.waitForTimeout(600);
  const bar = mp.locator(".rz-mobile-bar a").first();
  row("mobile bar CTA", `${(await bar.innerText()).trim()} → ${await bar.getAttribute("href")}`);
  await ctx.close();
  await m.close();
}

// ---- 404
{
  const r = await fetch(B + "/some/missing/page");
  const html = await r.text();
  row("404 status / demo CTA", `${r.status} / ${/href="\/#demo"/.test(html)}`);
  if (r.status !== 404 || !/href="\/#demo"/.test(html)) problems.push("404 page missing status or demo CTA");
}

// ---- metadata uniqueness
for (const k of ["title", "desc", "ogTitle", "ogDesc"]) {
  const seen = new Map();
  for (const m of meta) {
    if (!m[k]) { problems.push(`${m.path}: empty ${k}`); continue; }
    const key = m[k];
    const prev = seen.get(key);
    // States of one route may share metadata; different routes may not.
    const route = (x) => new URL(x, B).pathname;
    if (prev && route(prev) !== route(m.path)) problems.push(`duplicate ${k} on ${prev} and ${m.path}: "${key.slice(0, 60)}"`);
    else if (!prev) seen.set(key, m.path);
  }
}
row("metadata checked (title, description, og:title, og:description)", `${meta.length} pages`);

await browser.close();
console.log("\nPROBLEMS:", problems.length ? "\n- " + problems.join("\n- ") : "none");
