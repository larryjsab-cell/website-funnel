import type { MetadataRoute } from "next";
import { getAllPublishedPosts } from "@/lib/blog";
import { legal } from "@/lib/content";
import { affiliatesEnabled } from "@/lib/affiliate";
import { site, siteUrl } from "@/lib/site";

export const revalidate = 1800;

/** Public, indexable pages only. Customer links (/go-live, /changes, /book, /unsubscribe) and /admin are noindex. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const legalDate = new Date(legal.updated);
  const updated = Number.isNaN(legalDate.getTime()) ? new Date() : legalDate;
  const posts = await getAllPublishedPosts();
  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: posts[0] ? new Date(posts[0].updated_at) : new Date(), changeFrequency: "weekly", priority: 0.7 },
    ...posts.map((p) => ({ url: `${siteUrl}/blog/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: `${siteUrl}/templates`, lastModified: new Date("2026-10-23"), changeFrequency: "monthly", priority: 0.6 },
    ...(affiliatesEnabled() ? [{ url: `${siteUrl}${site.affiliates.path}`, lastModified: new Date("2026-10-28"), changeFrequency: "monthly" as const, priority: 0.5 }] : []),
    { url: `${siteUrl}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
