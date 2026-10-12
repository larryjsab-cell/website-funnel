// Fetches each page from the local production server and checks the SEO contract.
const B = "http://localhost:3000";
const pages = ["/", "/privacy", "/terms", "/this-page-does-not-exist", "/go-live?t=x", "/changes?t=x", "/book", "/unsubscribe?t=x", "/thank-you", "/admin"];
const attr = (html, re) => (html.match(re) || [])[1];
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const decode = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
const rows = [];
for (const path of pages) {
  const res = await fetch(B + path);
  const html = await res.text();
  const head = html.split("</head>")[0];
  const meta = (name) => decode(attr(head, new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`)));
  const title = decode(attr(head, /<title>([^<]*)<\/title>/));
  const desc = meta("description");
  const body = html.split("<body")[1] || "";
  const headings = all(body.replace(/<script[\s\S]*?<\/script>/g, ""), /<(h[1-6])[\s>]/g);
  let skips = [];
  headings.reduce((prev, h) => {
    const n = Number(h[1]);
    if (prev && n > prev + 1) skips.push(`${"h" + prev}→${h}`);
    return n;
  }, 0);
  const ld = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g).map((s) => {
    try {
      const j = JSON.parse(s);
      return (j["@graph"] || [j]).map((n) => n["@type"]).join("+");
    } catch (e) {
      return "INVALID JSON";
    }
  });
  rows.push({
    path,
    status: res.status,
    title: `${title} (${title?.length})`,
    desc: desc ? `${desc.length} chars` : "MISSING",
    canonical: attr(head, /<link rel="canonical" href="([^"]+)"/) || "-",
    robots: meta("robots") || "-",
    og: [meta("og:title") ? "title" : "", meta("og:description") ? "desc" : "", meta("og:image") ? `img(${meta("og:image:width")}x${meta("og:image:height")})` : "", meta("og:url") ? "url" : ""].filter(Boolean).join(","),
    ogImage: meta("og:image") || "-",
    twitter: [meta("twitter:card"), meta("twitter:title") ? "title" : "", meta("twitter:image") ? "img" : ""].filter(Boolean).join(","),
    h1: headings.filter((h) => h === "h1").length,
    skips: skips.join(" ") || "none",
    jsonld: ld.join(" | ") || "-",
    icons: all(head, /<link rel="(icon|apple-touch-icon|manifest)"/g).join(","),
  });
}
for (const r of rows) {
  console.log(`\n== ${r.path} [${r.status}]`);
  for (const [k, v] of Object.entries(r)) if (k !== "path" && k !== "status") console.log(`  ${k.padEnd(10)} ${v}`);
}
for (const f of ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/favicon.ico", "/apple-icon.png", "/opengraph-image", "/twitter-image"]) {
  const r = await fetch(B + f);
  const t = r.headers.get("content-type");
  console.log(`\n${f} ${r.status} ${t}`);
  if (t?.includes("text") || t?.includes("xml") || t?.includes("json")) console.log((await r.text()).slice(0, 900));
}
