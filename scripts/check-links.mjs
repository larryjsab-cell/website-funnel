// Crawl every internal link from "/" and report non-200s and orphans.
// Usage: node scripts/check-links.mjs [baseUrl]
const base = process.argv[2] ?? "http://localhost:3000";
const seen = new Map(); // path -> status
const linkedFrom = new Map(); // path -> Set(source)
const queue = ["/"];

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  const res = await fetch(base + path, { redirect: "manual" });
  seen.set(path, res.status);
  if (res.status !== 200 || !(res.headers.get("content-type") ?? "").includes("text/html")) continue;
  const html = await res.text();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const target = href.split("#")[0].split("?")[0] || "/";
    if (!linkedFrom.has(target)) linkedFrom.set(target, new Set());
    linkedFrom.get(target).add(path);
    if (!seen.has(target)) queue.push(target);
  }
}

const broken = [...seen].filter(([, s]) => s !== 200);
console.log(`Crawled ${seen.size} pages from ${base}`);
for (const [p, s] of seen) console.log(`  ${s}  ${p}  (linked from ${[...(linkedFrom.get(p) ?? [])].length} pages)`);
if (broken.length) {
  console.error(`BROKEN: ${broken.map(([p, s]) => `${p} → ${s}`).join(", ")}`);
  process.exit(1);
}
console.log("No broken internal links.");
