/**
 * Sitemaps, as on the junk-removals site: /sitemap.xml is an index pointing to
 * /sitemaps/main.xml (home, blog, templates, legal, location hub) and one file per
 * industry (/sitemaps/plumbers.xml ...), each under Google's 50,000-URL limit.
 */
import { affiliatesEnabled } from "@/lib/affiliate";
import { getAllPublishedPosts } from "@/lib/blog";
import { legal } from "@/lib/content";
import { cityPath, getIndustries, getIndustrySitemapRows, getStatePages, industryPath, LOCATIONS_PATH, locationsEnabled, statePath } from "@/lib/locations";
import { site, siteUrl } from "@/lib/site";

type Entry = { url: string; lastModified?: Date; changeFrequency?: string; priority?: number };

/** Sitemap file names after /sitemaps/, without ".xml". */
export async function sitemapNames(): Promise<string[]> {
  const industries = locationsEnabled() ? await getIndustries() : [];
  return ["main", ...industries.map((i) => i.slug)];
}

/** Public, indexable pages only. Customer links (/go-live, /changes, /book, /unsubscribe) and /admin are noindex. */
async function mainEntries(): Promise<Entry[]> {
  const legalDate = new Date(legal.updated);
  const updated = Number.isNaN(legalDate.getTime()) ? new Date() : legalDate;
  const posts = await getAllPublishedPosts();
  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: posts[0] ? new Date(posts[0].updated_at) : new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({ url: `${siteUrl}/blog/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly", priority: 0.6 })),
    { url: `${siteUrl}/templates`, lastModified: new Date("2026-10-23"), changeFrequency: "monthly", priority: 0.6 },
    ...(affiliatesEnabled() ? [{ url: `${siteUrl}${site.affiliates.path}`, lastModified: new Date("2026-10-28"), changeFrequency: "monthly", priority: 0.5 }] : []),
    ...(locationsEnabled() ? [{ url: `${siteUrl}${LOCATIONS_PATH}`, changeFrequency: "monthly", priority: 0.6 }] : []),
    { url: `${siteUrl}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}

/** One industry: its page, its 51 state pages and every city page. */
async function industryEntries(industry: string): Promise<Entry[] | null> {
  if (!locationsEnabled()) return null;
  const [states, cities] = await Promise.all([getStatePages(industry), getIndustrySitemapRows(industry)]);
  if (!states.length) return null;
  return [
    { url: `${siteUrl}${industryPath(industry)}`, changeFrequency: "monthly", priority: 0.6 },
    ...states.map((s) => ({ url: `${siteUrl}${statePath(industry, s.state_slug)}`, lastModified: new Date(s.updated_at), changeFrequency: "monthly", priority: 0.5 })),
    ...cities.map((c) => ({ url: `${siteUrl}${cityPath(industry, c.state_slug, c.city_slug)}`, lastModified: new Date(c.updated_at), changeFrequency: "monthly", priority: 0.4 })),
  ];
}

export async function sitemapEntries(name: string): Promise<Entry[] | null> {
  if (name === "main") return mainEntries();
  if (!(await sitemapNames()).includes(name)) return null;
  return industryEntries(name);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function urlsetXml(entries: Entry[]): string {
  const rows = entries.map(
    (e) =>
      `<url><loc>${esc(e.url)}</loc>${e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>` : ""}${
        e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : ""
      }${e.priority != null ? `<priority>${e.priority}</priority>` : ""}</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>\n`;
}

export function indexXml(names: string[]): string {
  const now = new Date().toISOString();
  const rows = names.map((n) => `<sitemap><loc>${esc(`${siteUrl}/sitemaps/${n}.xml`)}</loc><lastmod>${now}</lastmod></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</sitemapindex>\n`;
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" };
