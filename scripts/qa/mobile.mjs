// Mobile audit: every route/state on phone, landscape and tablet profiles.
// Usage: node mobile.mjs [outDir] [--quick]
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { mkdirSync, writeFileSync } from "node:fs";
import { mockSupabase } from "./mocks.mjs";

const B = "http://localhost:3000";
const OUT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".website-audit/mobile";
const QUICK = process.argv.includes("--quick");
mkdirSync(`${OUT}/shots`, { recursive: true });
const T = { review: "a".repeat(48), paid: "b".repeat(48), closed: "c".repeat(48), files: "d".repeat(48) };
const STYLES = ["brutalist", "minimal", "editorial", "organic", "corporate", "luxury", "playful"];

const DEVICES = {
  p320: { width: 320, height: 568, mobile: true },
  p360: { width: 360, height: 740, mobile: true },
  p375: { width: 375, height: 667, mobile: true },
  p390: { width: 390, height: 844, mobile: true },
  p414: { width: 414, height: 896, mobile: true },
  p430: { width: 430, height: 932, mobile: true },
  l568: { width: 568, height: 320, mobile: true },
  l667: { width: 667, height: 375, mobile: true },
  l844: { width: 844, height: 390, mobile: true },
  l932: { width: 932, height: 430, mobile: true },
  t768: { width: 768, height: 1024, mobile: true },
  t1024: { width: 1024, height: 768, mobile: true },
};

const ROUTES = [
  ["/", "home"], ["/privacy", "privacy"], ["/terms", "terms"], ["/nope", "404"],
  [`/go-live?t=${T.review}&offer=standard`, "golive"], [`/go-live?t=${T.review}&offer=host50-year&interval=year`, "golive-year"],
  [`/go-live?t=${T.files}&offer=files99`, "golive-files"], [`/go-live?t=${T.paid}`, "golive-paid"], [`/go-live?t=${T.closed}`, "golive-closed"],
  [`/go-live/success?t=${T.paid}`, "success"], [`/changes?t=${T.paid}`, "changes"], [`/changes?t=${T.review}`, "changes-unpaid"],
  [`/book?t=${T.paid}`, "book"], ["/book", "book-public"], [`/unsubscribe?t=${T.review}`, "unsubscribe"],
  ["/thank-you", "thanks"], ["/thank-you?error=validation&fields=phone:phone,email:email", "thanks-invalid"],
  ["/admin", "admin-today"], ["/admin?view=board", "admin-board"], ["/admin?view=table", "admin-table"], ["/admin/s/s1", "admin-detail"],
];

/* Runs in the page. */
function inspect() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const visible = (el) => {
    if (el.closest("[inert],[aria-hidden=true],.sr-only")) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter((c) => c.startsWith("rz-")).slice(0, 2).map((c) => "." + c).join("") : "";
    const text = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 36);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ""}`;
  };

  // 1. overflow
  const overflow = document.documentElement.scrollWidth - vw;
  const offenders = [];
  if (overflow > 0) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && visible(el) && ![...el.children].some((c) => c.getBoundingClientRect().right > vw + 1)) offenders.push(`${describe(el)} +${Math.round(r.right - vw)}`);
    }
  }

  // 2/3. tap targets
  const targets = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, label:has(input[type=radio]), [role=button]")]
    .filter(visible)
    .filter((el) => !(el.tagName === "INPUT" && (el.type === "radio" || el.type === "checkbox") && el.closest("label")))
    .filter((el) => !el.closest("[aria-hidden=true]"));
  const inlineLink = (el) => {
    if (el.tagName !== "A") return false;
    if (!getComputedStyle(el).display.startsWith("inline") || getComputedStyle(el).display === "inline-flex" || getComputedStyle(el).display === "inline-block") return false;
    const p = el.parentElement;
    const own = [...p.childNodes].filter((n) => n !== el).map((n) => n.textContent).join("").trim();
    return own.length > 0;
  };
  const small = [];
  const rects = [];
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    if (inlineLink(el)) continue;
    if (r.width < 44 || r.height < 44) small.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    rects.push([el, r]);
  }
  const crowded = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i];
      const [b, rb] = rects[j];
      if (a.contains(b) || b.contains(a)) continue;
      const pinned = (el) => { for (let n = el; n; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === "fixed" || ps === "sticky") return true; } return false; };
      if (pinned(a) !== pinned(b)) continue;
      if (a.closest("[role=group]") && a.closest("[role=group]") === b.closest("[role=group]")) continue;
      const dx = Math.max(0, Math.max(ra.left, rb.left) - Math.min(ra.right, rb.right));
      const dy = Math.max(0, Math.max(ra.top, rb.top) - Math.min(ra.bottom, rb.bottom));
      const overlapX = dx === 0, overlapY = dy === 0;
      const area = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)) * Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      const gap = overlapX && overlapY ? (area > 1 ? -1 : 0) : overlapX ? dy : overlapY ? dx : Math.hypot(dx, dy);
      const full = (r) => r.width >= 44 && r.height >= 44;
      const stacked = overlapX && !overlapY;
      if (gap < 8 && (overlapX || overlapY) && !(full(ra) && full(rb) && gap >= 0)) crowded.push(`${describe(a)} ↔ ${describe(b)} gap ${Math.round(gap)}`);
    }
  }

  // 4. small text
  const smallText = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || !visible(el) || el.closest("svg")) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 15.5) smallText.add(`${describe(el)} ${fs}px`);
  }

  // 5. input font size (iOS zooms below 16px)
  const zoomInputs = [...document.querySelectorAll("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), select, textarea")]
    .filter(visible).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map(describe);

  // 6. fixed/sticky
  const fixed = [...document.querySelectorAll("body *")].filter((el) => {
    const p = getComputedStyle(el).position;
    if (p !== "fixed" && p !== "sticky") return false;
    if (!visible(el)) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh && r.width > vw * 0.5;
  }).map((el) => ({ el: describe(el), h: Math.round(el.getBoundingClientRect().height), top: Math.round(el.getBoundingClientRect().top) }));

  // clipped text
  const clipped = [...document.querySelectorAll("body *")].filter((el) => {
    const s = getComputedStyle(el);
    return visible(el) && ["hidden", "clip"].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && el.textContent.trim() && !el.closest(".sr-only") && s.textOverflow !== "ellipsis";
  }).map((el) => `${describe(el)} ${el.scrollWidth}>${el.clientWidth}`).slice(0, 10);

  // text running past its own box (no clipping container, so nothing else catches it)
  const spill = [...document.querySelectorAll("body *")].filter((el) => {
    if (!visible(el) || el.closest("svg,[aria-hidden=true]")) return false;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) return false;
    const s = getComputedStyle(el);
    return s.display !== "inline" && s.overflowX === "visible" && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
  }).map((el) => `${describe(el)} ${el.scrollWidth}>${el.clientWidth}`).slice(0, 10);

  return { vw, vh, spill, overflow: Math.max(0, overflow), offenders: offenders.slice(0, 10), small: [...new Set(small)].slice(0, 40), crowded: [...new Set(crowded)].slice(0, 30), smallText: [...smallText].slice(0, 20), zoomInputs, fixed, clipped };
}

function firstScreen() {
  const vh = window.innerHeight;
  const bottomBars = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return getComputedStyle(el).position === "fixed" && r.bottom >= vh - 1 && r.top < vh && r.height < vh / 2 && !el.closest("[inert],[aria-hidden=true]"); }).reduce((h, el) => Math.max(h, el.getBoundingClientRect().height), 0);
  const usable = vh - bottomBars;
  const h1 = document.querySelector("h1")?.getBoundingClientRect();
  const offer = document.querySelector(".rz-offer-line, [data-offer-line]")?.getBoundingClientRect();
  const cta = [...document.querySelectorAll("main a[href='/#demo'], main a[href='#demo']")].find((a) => a.getBoundingClientRect().height > 0)?.getBoundingClientRect();
  return { vh, bottomBars: Math.round(bottomBars), h1Bottom: h1 && Math.round(h1.bottom), offerBottom: offer && Math.round(offer.bottom), ctaBottom: cta && Math.round(cta.bottom), usable: Math.round(usable) };
}

function hoverRules() {
  const out = [];
  const walk = (rules, inHoverMedia) => {
    for (const r of rules) {
      if (r.media) walk(r.cssRules, inHoverMedia || /hover:\s*hover/.test(r.media.mediaText));
      else if (r.cssRules && !r.selectorText) walk(r.cssRules, inHoverMedia);
      else if (r.selectorText?.includes(":hover") && !inHoverMedia) out.push(r.selectorText.slice(0, 80));
    }
  };
  for (const s of document.styleSheets) {
    try { walk(s.cssRules, false); } catch {}
  }
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = [];
const devices = QUICK ? ["p320", "p375", "l667", "t768"] : Object.keys(DEVICES);

async function open(dev, path, style) {
  const d = DEVICES[dev];
  const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, isMobile: d.mobile, hasTouch: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  if (path.startsWith("/admin")) {
    await mockSupabase(p);
    await p.goto(B + "/admin", { waitUntil: "networkidle" });
    await p.fill("#admin-email", "larryjsab@gmail.com");
    await p.fill("#admin-password", "x");
    await p.getByRole("button", { name: /sign in/i }).click();
    await p.waitForTimeout(600);
  }
  const url = B + path + (style ? `${path.includes("?") ? "&" : "?"}style=${style}` : "");
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);
  return { ctx, p };
}

for (const [path, name] of ROUTES) {
  for (const dev of devices) {
    const { ctx, p } = await open(dev, path);
    const top = await p.evaluate(inspect);
    // scroll midway and to the end so fixed bars that appear later are counted
    await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: "instant" }));
    await p.waitForTimeout(900);
    const mid = await p.evaluate(inspect);
    const fs = name === "home" ? await (async () => { await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" })); await p.waitForTimeout(200); return p.evaluate(firstScreen); })() : null;
    if (["p320", "p375", "l667"].includes(dev)) {
      await p.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${OUT}/shots/${name}-${dev}.png`, fullPage: dev !== "l667" });
    }
    results.push({ route: name, dev, top, mid, firstScreen: fs });
    await ctx.close();
  }
}
// all styles on home
for (const style of STYLES) {
  for (const dev of ["p320", "p375", "l667"]) {
    const { ctx, p } = await open(dev, "/", style);
    const top = await p.evaluate(inspect);
    await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.45, behavior: "instant" }));
    await p.waitForTimeout(900);
    const mid = await p.evaluate(inspect);
    if (dev === "p375") await p.screenshot({ path: `${OUT}/shots/home-${style}-p375.png`, fullPage: true });
    results.push({ route: `home:${style}`, dev, top, mid });
    await ctx.close();
  }
}
// hover rules once
{
  const { ctx, p } = await open("p375", "/");
  results.push({ route: "css", hoverRulesOutsideHoverMedia: await p.evaluate(hoverRules) });
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));

// summary
const agg = {};
const add = (k, v, where) => { (agg[k] ??= new Map()); if (!agg[k].has(v)) agg[k].set(v, new Set()); agg[k].get(v).add(where); };
for (const r of results.filter((x) => x.top)) {
  const where = `${r.route}@${r.dev}`;
  for (const snap of [r.top, r.mid]) {
    if (snap.overflow) add("overflow", `+${snap.overflow}px: ${snap.offenders.join(" | ")}`, where);
    snap.small.forEach((s) => add("small", s.replace(/ \d+×\d+$/, (m) => m), where));
    snap.crowded.forEach((s) => add("crowded", s, where));
    snap.smallText.forEach((s) => add("smallText", s, where));
    snap.zoomInputs.forEach((s) => add("zoomInputs", s, where));
    snap.clipped.forEach((s) => add("clipped", s, where));
    (snap.spill || []).forEach((s) => add("textSpill", s, where));
    const fixedH = snap.fixed.reduce((h, f) => h + f.h, 0);
    if (fixedH / snap.vh > 0.2) add("fixedTooTall", `${fixedH}px of ${snap.vh}px (${snap.fixed.map((f) => `${f.el.slice(0, 30)}:${f.h}`).join(", ")})`, where);
  }
  if (r.firstScreen) {
    const f = r.firstScreen;
    const miss = [];
    if (!(f.h1Bottom <= f.usable)) miss.push(`h1 ${f.h1Bottom}`);
    if (!(f.offerBottom <= f.usable)) miss.push(`offer ${f.offerBottom}`);
    if (!(f.ctaBottom <= f.usable)) miss.push(`cta ${f.ctaBottom}`);
    if (miss.length) add("belowFold", `usable ${f.usable}px: ${miss.join(", ")}`, where);
  }
}
for (const [k, m] of Object.entries(agg)) {
  console.log(`\n## ${k} (${m.size})`);
  for (const [v, w] of m) console.log(`- ${v}\n    at ${[...w].slice(0, 8).join(", ")}${w.size > 8 ? ` +${w.size - 8}` : ""}`);
}
const css = results.find((r) => r.route === "css");
console.log(`\n## hover rules outside (hover:hover): ${css.hoverRulesOutsideHoverMedia.length}`);
console.log(css.hoverRulesOutsideHoverMedia.slice(0, 12).join("\n"));
