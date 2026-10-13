import type { MetadataRoute } from "next";
import { getAllPublishedPosts } from "@/lib/blog";
import { legal } from "@/lib/content";
import { siteUrl } from "@/lib/site";

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
    { url: `${siteUrl}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
