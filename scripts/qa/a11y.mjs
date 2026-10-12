// Phase 10 verification: axe on every page/state, keyboard traversal with focus-indicator check,
// hover/disabled contrast, reduced motion, landmarks, link text, and announced form errors.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { readFileSync } from "node:fs";
// axe-core: set AXE_PATH to its axe.min.js, or install it next to this script.
const axe = readFileSync(process.env.AXE_PATH || new URL("./node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const B = "http://localhost:3000";
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const STYLES = ["brutalist", "minimal", "editorial", "organic", "corporate", "luxury", "playful"];
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const note = (k, v) => console.log(k.padEnd(52), v);

// ---- Supabase mock for /admin
const now = Date.now();
const iso = (d) => new Date(now + d * 86400000).toISOString();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256" })}.${b64({ sub: "u1", role: "authenticated", exp: Math.floor(now / 1000) + 3600 })}.x`;
const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "larryjsab@gmail.com", app_metadata: {}, user_metadata: {} };
const sub = { id: "s1", public_token: "t", form_type: "demo", name: "Pat West", email: "pat@example.com", phone: "2485550101", business_name: "West Plumbing", industry: "Plumbing", current_site: null, goals: "More calls", style: "Minimal", message: null, form_answers: {}, timezone: "America/Detroit", status: "demo_review", demo_url: "https://example.com", demo_image_url: null, demo_uploaded_at: iso(-2), plan: null, billing_interval: null, offer: null, paid_at: null, files_path: null, files_url: null, files_url_expires_at: null, live_url: null, source_page: "/", referrer: null, utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null, automations_paused: false, unsubscribed_at: null, admin_notes: null, last_status_at: iso(-2), created_at: iso(-3), updated_at: iso(0) };
const queue = [{ id: 1, submission_id: "s1", template_key: "offer_1", send_at: iso(2), state: "pending", requires_status: null, change_request_id: null, vars: {}, attempts: 0, last_error: null, cancel_reason: null, sent_at: null, opened_at: null, clicked_at: null, created_at: iso(-2) }];
async function mockSupabase(p) {
  await p.route("https://woejhqidgykrcdyktuio.supabase.co/**", (route) => {
    const u = new URL(route.request().url());
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (u.pathname === "/auth/v1/token") return json({ access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, refresh_token: "r", user });
    if (u.pathname === "/auth/v1/user") return json(user);
    if (u.pathname.includes("is_admin")) return json(true);
    if (u.pathname.includes("/rpc/")) return json(null);
    const single = (route.request().headers()["accept"] || "").includes("vnd.pgrst.object");
    const t = u.pathname.split("/").pop();
    const rows = { ryzon_landing_submissions: [sub], ryzon_landing_email_queue: u.searchParams.get("state") ? [] : queue }[t] ?? [];
    return json(single ? rows[0] ?? null : rows);
  });
}

async function runAxe(p, label) {
  await p.evaluate(async () => document.fonts.ready);
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: axe });
  const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" ; ")}`));
  if (v.length) problems.push(`axe ${label}: ${v.join(" | ")}`);
  return v.length;
}

// ---- 1. axe everywhere
let axeRuns = 0;
const pages = [
  ["/", "home"], ["/privacy", "privacy"], ["/terms", "terms"], ["/nope", "404"],
  [`/go-live?t=${T.review}&offer=standard`, "go-live"], [`/go-live?t=${T.files}&offer=files99`, "go-live files"], [`/go-live?t=${T.paid}`, "go-live paid"],
  [`/go-live?t=${T.closed}`, "go-live closed"], [`/changes?t=${T.paid}`, "changes"], [`/changes?t=${T.review}`, "changes unpaid"], [`/book?t=${T.paid}`, "book"], ["/book", "book public"],
  [`/unsubscribe?t=${T.review}`, "unsubscribe"], [`/unsubscribe?t=${T.review}&done=1`, "unsubscribed"],
  ["/thank-you", "thanks-demo"], ["/thank-you?form=contact", "thanks-contact"], ["/thank-you?error=validation&fields=phone:phone,email:email", "thanks-invalid"], ["/thank-you?error=upstream", "thanks-error"],
];
for (const w of [1280, 375]) {
  for (const [path, label] of pages) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(B + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    axeRuns++;
    await runAxe(p, `${label}@${w}`);
    await p.close();
  }
  for (const s of STYLES) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto(`${B}/?style=${s}`, { waitUntil: "networkidle" });
    await p.locator("#styles").scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    axeRuns++;
    await runAxe(p, `home ${s}@${w}`);
    await p.close();
  }
}
// States: mobile drawer, demo form errors + step 2, contact errors, admin views
{
  const p = await b.newPage({ viewport: { width: 375, height: 812 } });
  await p.goto(B + "/", { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Open menu" }).click();
  axeRuns++; await runAxe(p, "home drawer open@375");
  await p.keyboard.press("Escape");
  await p.locator("#demo").scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: /^Next/ }).first().click();
  axeRuns++; await runAxe(p, "demo step1 errors");
  const announced = async (scope) => p.evaluate((scope) => {
    const el = document.activeElement;
    const ids = (el?.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    return { inScope: !!el?.closest(scope), field: el?.id, invalid: el?.getAttribute("aria-invalid"), error: ids.map((i) => document.getElementById(i)?.textContent?.trim()).filter(Boolean).join(" ") };
  }, scope);
  const d = await announced("#demo");
  note("demo errors: focus → field / invalid / described error", `${d.field} / ${d.invalid} / "${d.error}"`);
  if (!d.inScope || d.invalid !== "true" || !d.error) problems.push("demo form errors not announced");
  await p.fill("#demo-name", "Jordan Smith");
  await p.fill("#demo-email", "jordan@example.com");
  await p.getByRole("button", { name: /^Next/ }).first().click();
  await p.waitForTimeout(300);
  axeRuns++; await runAxe(p, "demo step2");
  await p.locator("#contact").scrollIntoViewIfNeeded();
  await p.locator("#contact form button[type=submit]").click();
  await p.waitForTimeout(200);
  axeRuns++; await runAxe(p, "contact errors");
  const c = await announced("#contact");
  note("contact errors: focus → field / invalid / described error", `${c.field} / ${c.invalid} / "${c.error}"`);
  if (!c.inScope || c.invalid !== "true" || !c.error) problems.push("contact form errors not announced");
  await p.close();
}
for (const [view, w] of [["today", 1280], ["board", 1280], ["table", 1280], ["board", 375]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await mockSupabase(p);
  await p.goto(B + "/admin", { waitUntil: "networkidle" });
  if (view === "today" && w === 1280) { axeRuns++; await runAxe(p, "admin login"); }
  await p.fill("#admin-email", "larryjsab@gmail.com");
  await p.fill("#admin-password", "x");
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("heading", { name: "Today" }).waitFor();
  if (view !== "today") await p.getByRole("link", { name: view === "board" ? "Board" : "Table" }).click();
  await p.waitForTimeout(400);
  axeRuns++; await runAxe(p, `admin ${view}@${w}`);
  if (view === "table") {
    await p.goto(B + "/admin/s/s1", { waitUntil: "networkidle" });
    await p.getByRole("heading", { name: "West Plumbing" }).waitFor();
    axeRuns++; await runAxe(p, "admin detail");
  }
  await p.close();
}
note("axe pages/states scanned", axeRuns);

// ---- 2. keyboard traversal + visible focus
async function tabWalk(path, w, setup) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  if (path.startsWith("/admin")) await mockSupabase(p);
  await p.goto(B + path, { waitUntil: "networkidle" });
  if (setup) await setup(p);
  const seen = [];
  let back = 0;
  for (let i = 0; i < 160; i++) {
    await p.keyboard.press("Tab");
    const info = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const target = el.matches("input.sr-only") ? el.closest("label") ?? el : el;
      const cs = getComputedStyle(target);
      const r = target.getBoundingClientRect();
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
      return {
        key: el.tagName + "#" + (el.id || "") + "|" + (el.getAttribute("href") || el.getAttribute("name") || "") + "|" + (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30),
        ring,
        visible: r.width > 0 && r.height > 0 && cs.visibility !== "hidden",
        y: Math.round(r.top + window.scrollY),
      };
    });
    if (!info) { if (++back > 1) break; continue; }
    if (seen.length && info.key === seen[0].key) break;
    seen.push(info);
  }
  const noRing = seen.filter((s) => !s.ring);
  const hidden = seen.filter((s) => !s.visible);
  const focusables = await p.evaluate(() => [...document.querySelectorAll("a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])")].filter((e) => !e.closest("[hidden],[inert],[aria-hidden=true]") && getComputedStyle(e).visibility !== "hidden").length);
  await p.close();
  return { n: seen.length, focusables, noRing, hidden };
}
for (const [path, w, setup] of [
  ["/", 1280], ["/", 375], ["/privacy", 1280], ["/nope", 1280],
  [`/go-live?t=${T.review}&offer=standard`, 1280], [`/book?t=${T.paid}`, 375], [`/changes?t=${T.paid}`, 1280],
  ["/admin", 1280],
]) {
  const r = await tabWalk(path, w, setup);
  note(`keyboard ${path.slice(0, 30)}@${w}`, `${r.n} stops of ${r.focusables} focusable | no ring: ${r.noRing.length} | hidden: ${r.hidden.length}`);
  if (r.noRing.length) problems.push(`no focus ring on ${path}@${w}: ${r.noRing.slice(0, 4).map((s) => s.key).join(" , ")}`);
  if (r.hidden.length) problems.push(`focus on hidden element ${path}@${w}: ${r.hidden.slice(0, 4).map((s) => s.key).join(" , ")}`);
}

// ---- 3. hover + disabled contrast on every link/button, every style
const contrastFn = () => {
  const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0.5)) return c.slice(0, 3); } return [255, 255, 255]; };
  window.__contrast = (el) => {
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    const bg = bgOf(el);
    const [a, b2] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + 0.05) / (b2 + 0.05);
  };
};
let hovered = 0;
for (const s of STYLES) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await p.goto(`${B}/?style=${s}`, { waitUntil: "networkidle" });
  await p.evaluate(contrastFn);
  const n = await p.locator("main a, main button, footer a, header a").count();
  for (let i = 0; i < n; i++) {
    const el = p.locator("main a, main button, footer a, header a").nth(i);
    if (!(await el.isVisible())) continue;
    await el.hover({ force: true }).catch(() => {});
    hovered++;
    const ratio = await el.evaluate((e) => {
      // the text-bearing element: the control itself or its first text child
      const t = [...e.querySelectorAll("*")].find((c) => c.childNodes.length && [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(c).display !== "none") || e;
      return { r: window.__contrast(t), big: parseFloat(getComputedStyle(t).fontSize) >= 24 || (parseFloat(getComputedStyle(t).fontSize) >= 18.66 && +getComputedStyle(t).fontWeight >= 700), txt: e.textContent.trim().slice(0, 25) };
    });
    if (ratio.r < (ratio.big ? 3 : 4.5)) problems.push(`hover contrast ${s}: "${ratio.txt}" ${ratio.r.toFixed(2)}`);
  }
  await p.close();
}
note("hover states contrast-checked", hovered);
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(`${B}/book?t=${T.paid}`, { waitUntil: "networkidle" });
  await p.getByText(/Time \(/).waitFor();
  await p.evaluate(contrastFn);
  const r = await p.getByRole("button", { name: /Earlier/ }).evaluate((e) => ({ dis: e.disabled, r: window.__contrast(e) }));
  note("disabled 'Earlier dates' contrast", `${r.r.toFixed(2)} (disabled=${r.dis})`);
  if (r.r < 4.5) problems.push(`disabled contrast ${r.r}`);
  await p.close();
}

// ---- 4. reduced motion
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await p.goto(B + "/", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => ({
    long: document.getAnimations().filter((a) => (a.effect?.getComputedTiming().duration ?? 0) > 1).length,
    all: document.getAnimations().length,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    transition: getComputedStyle(document.querySelector("a[data-cta]")).transitionDuration,
  }));
  note("reduced motion: animations >1ms / scroll / transition", `${r.long} of ${r.all} / ${r.scroll} / ${r.transition}`);
  if (r.long || r.scroll === "smooth") problems.push("reduced motion not respected");
  await p.close();
}

// ---- 5. landmarks, link text
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(B + "/", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => {
    const generic = /^(click here|here|read more|learn more|more|link|this)$/i;
    const name = (a) => (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim();
    const links = [...document.querySelectorAll("a[href]")];
    const byName = {};
    for (const a of links) { const n = name(a); (byName[n] ??= new Set()).add(a.getAttribute("href")); }
    return {
      landmarks: { header: document.querySelectorAll("header").length, nav: document.querySelectorAll("nav").length, main: document.querySelectorAll("main").length, footer: document.querySelectorAll("footer").length },
      skip: document.querySelector("a[href='#main']")?.textContent?.trim(),
      generic: links.filter((a) => generic.test(name(a))).map(name),
      ambiguous: Object.entries(byName).filter(([, h]) => h.size > 1).map(([n, h]) => `${n} → ${[...h].join(",")}`),
    };
  });
  note("landmarks", JSON.stringify(r.landmarks) + " | skip link: " + r.skip);
  note("generic link text", r.generic.length ? r.generic.join(", ") : "none");
  note("same text, different destinations", r.ambiguous.length ? r.ambiguous.join(" ; ") : "none");
  if (r.generic.length || r.ambiguous.length) problems.push("link text: " + [...r.generic, ...r.ambiguous].join(" ; "));
  await p.close();
}

console.log("\nPROBLEMS:", problems.length ? "\n- " + problems.join("\n- ") : "none");
await b.close();
