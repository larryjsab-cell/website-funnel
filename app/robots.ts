import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Private, per-customer and API paths. Everything else is open to search and AI crawlers. */
const PRIVATE = ["/admin", "/api/", "/go-live", "/changes", "/book", "/unsubscribe"];

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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
