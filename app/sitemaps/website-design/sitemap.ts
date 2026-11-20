import type { MetadataRoute } from "next";
import { absolute, cityPath, getIndustries, getIndustrySitemapRows, getStatePages, industryPath, locationsEnabled, statePath } from "@/lib/locations";

export const revalidate = 86400;

/** One sitemap per industry: /sitemaps/website-design/sitemap/{industry}.xml, about 19,300 URLs each. */
export async function generateSitemaps() {
  if (!locationsEnabled()) return [];
  return (await getIndustries()).map((i) => ({ id: i.slug }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  if (!locationsEnabled()) return [];
  const industry = await props.id;
  const [states, cities] = await Promise.all([getStatePages(industry), getIndustrySitemapRows(industry)]);
  if (!states.length) return [];
  return [
    { url: absolute(industryPath(industry)), changeFrequency: "monthly", priority: 0.6 },
    ...states.map((s) => ({ url: absolute(statePath(industry, s.state_slug)), lastModified: new Date(s.updated_at), changeFrequency: "monthly" as const, priority: 0.5 })),
    ...cities.map((c) => ({ url: absolute(cityPath(industry, c.state_slug, c.city_slug)), lastModified: new Date(c.updated_at), changeFrequency: "monthly" as const, priority: 0.4 })),
  ];
}
