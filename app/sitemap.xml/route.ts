import { indexXml, sitemapNames, XML_HEADERS } from "@/lib/sitemaps";

export const revalidate = 3600;

/** Sitemap index: main pages plus one file per industry. */
export async function GET() {
  return new Response(indexXml(await sitemapNames()), { headers: XML_HEADERS });
}
