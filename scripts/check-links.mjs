// Crawl every internal link from "/", check each page returns 200 and every
// "#anchor" points at an element id that exists on the target page.
// Usage: node scripts/check-links.mjs [baseUrl]
const base = process.argv[2] ?? "http://localhost:3000";
const pages = new Map(); // path -> { status, ids }
const anchors = []; // { from, path, id }
const queue = ["/"];

while (queue.length) {
  const path = queue.shift();
  if (pages.has(path)) continue;
  const res = await fetch(base + path, { redirect: "manual" });
  const entry = { status: res.status, ids: new Set() };
  pages.set(path, entry);
  if (res.status !== 200 || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
  const html = await res.text();
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) entry.ids.add(id);
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const isLocal = href.startsWith("/") && !href.startsWith("//");
    if (!isLocal && !href.startsWith("#")) continue;
    const [rawPath, id] = href.split("#");
    const target = (isLocal ? rawPath.split("?")[0] : path) || "/";
    if (id) anchors.push({ from: path, path: target, id });
    if (!pages.has(target)) queue.push(target);
  }
}

const broken = [...pages].filter(([, p]) => p.status !== 200).map(([path, p]) => `${path} → ${p.status}`);
const missing = anchors.filter((a) => !pages.get(a.path)?.ids.has(a.id)).map((a) => `${a.path}#${a.id} (from ${a.from})`);
const uniqueAnchors = [...new Set(anchors.map((a) => `${a.path}#${a.id}`))];

console.log(`Crawled ${pages.size} pages, ${uniqueAnchors.length} unique anchors from ${base}`);
for (const [p, e] of pages) console.log(`  ${e.status}  ${p}`);
console.log(`  anchors: ${uniqueAnchors.join("  ")}`);
if (broken.length || missing.length) {
  if (broken.length) console.error(`BROKEN PAGES: ${broken.join(", ")}`);
  if (missing.length) console.error(`MISSING ANCHORS: ${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}
console.log("No broken internal links or anchors.");
