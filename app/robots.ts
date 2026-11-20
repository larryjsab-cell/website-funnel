import type { MetadataRoute } from "next";
import { getIndustries, locationsEnabled } from "@/lib/locations";
import { siteUrl } from "@/lib/site";

/** Private, per-customer and API paths. Everything else is open to search and AI crawlers. */
const PRIVATE = ["/admin", "/api/", "/go-live", "/changes", "/book", "/unsubscribe", "/thank-you", "/review"];

/**
 * AI assistants and answer engines we want to read the site, so people asking
 * "affordable website for my small business" can be pointed here.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Location pages have one sitemap per industry (each under Google's 50,000-URL limit).
  const industries = locationsEnabled() ? await getIndustries() : [];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, ...industries.map((i) => `${siteUrl}/sitemaps/website-design/sitemap/${i.slug}.xml`)],
    host: siteUrl,
  };
}
