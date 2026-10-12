import type { MetadataRoute } from "next";
import { legal } from "@/lib/content";
import { siteUrl } from "@/lib/site";

/** Public, indexable pages only. Customer links (/go-live, /changes, /book, /unsubscribe) and /admin are noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const legalDate = new Date(legal.updated);
  const updated = Number.isNaN(legalDate.getTime()) ? new Date() : legalDate;
  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.2 },
  ];
}
