import { sitemapEntries, urlsetXml, XML_HEADERS } from "@/lib/sitemaps";

export const revalidate = 3600;

/** /sitemaps/main.xml and /sitemaps/{industry}.xml. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.xml$/, "");
  const entries = /^[a-z0-9-]{1,60}$/.test(name) ? await sitemapEntries(name) : null;
  if (!entries) return new Response("Not found", { status: 404 });
  return new Response(urlsetXml(entries), { headers: XML_HEADERS });
}
