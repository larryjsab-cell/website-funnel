/**
 * Location pages: "Website design for {industry} in {city}, {ST}", one database row per
 * page (public.ryzon_landing_city_pages / _state_pages, written by
 * ryzon_landing_build_location_pages()). Read on the server with the public key; pages
 * render on first visit and stay cached for a day (ISR).
 *
 * Prices and the current offer come from site.config.json, never from the rows, so a
 * price change never needs 96,000 rows rewritten.
 */
import { PUBLIC_API as API, publicHeaders } from "@/lib/publicApi";
import { site, siteUrl } from "@/lib/site";

export const LOCATION_REVALIDATE = 86400;
const PAGE = 1000; // Supabase returns at most 1,000 rows per request

/** Off until site.config.json turns it on; LOCATIONS_PREVIEW=1 shows the pages locally. */
export function locationsEnabled(): boolean {
  return site.locations.enabled || process.env.LOCATIONS_PREVIEW === "1";
}

export const LOCATIONS_PATH = site.locations.path;

export type Faq = { question: string; answer: string };

export type Industry = {
  slug: string;
  name: string;
  label: string;
  plural: string;
  singular: string;
  trade: string;
  site_includes: string[];
  sort: number;
};

export type CityPage = {
  industry_slug: string;
  state_slug: string;
  state_code: string;
  state_name: string;
  city_slug: string;
  city_name: string;
  county: string | null;
  area_label: string;
  lat: number | null;
  lng: number | null;
  nearby_cities: string | null;
  unique_intro: string;
  city_context: string;
  search_note: string;
  site_includes: string;
  faqs: Faq[];
  meta_title: string;
  meta_description: string;
  updated_at: string;
};

export type StatePage = {
  industry_slug: string;
  state_slug: string;
  state_code: string;
  state_name: string;
  hero_title: string;
  intro: string;
  state_context: string;
  city_count: number;
  faqs: Faq[];
  meta_title: string;
  meta_description: string;
  updated_at: string;
};

export type CityLink = { city_slug: string; city_name: string };

const SLUG = /^[a-z0-9-]{1,120}$/;

async function query<T>(table: string, params: string): Promise<T[]> {
  try {
    const res = await fetch(`${API}/${table}?${params}`, {
      headers: publicHeaders,
      next: { revalidate: LOCATION_REVALIDATE, tags: ["locations"] },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T[];
  } catch (e) {
    console.warn(`[locations] ${table} query failed (${(e as Error).message}): ${params.slice(0, 80)}`);
    return [];
  }
}

/** Every row, 1,000 at a time. `total` is how many rows to expect (from a count or the state page). */
async function queryAll<T>(table: string, params: string, total: number): Promise<T[]> {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const chunks = await Promise.all(Array.from({ length: pages }, (_, i) => query<T>(table, `${params}&limit=${PAGE}&offset=${i * PAGE}`)));
  return chunks.flat();
}

export function getIndustries(): Promise<Industry[]> {
  return query<Industry>("ryzon_landing_industries", "select=slug,name,label,plural,singular,trade,site_includes,sort&order=sort");
}

export async function getIndustry(slug: string): Promise<Industry | null> {
  if (!SLUG.test(slug)) return null;
  return (await getIndustries()).find((i) => i.slug === slug) ?? null;
}

export function getStatePages(industry: string): Promise<StatePage[]> {
  if (!SLUG.test(industry)) return Promise.resolve([]);
  return query<StatePage>("ryzon_landing_state_pages", `select=*&industry_slug=eq.${industry}&order=state_name`);
}

export async function getStatePage(industry: string, state: string): Promise<StatePage | null> {
  if (!SLUG.test(industry) || !SLUG.test(state)) return null;
  const rows = await query<StatePage>("ryzon_landing_state_pages", `select=*&industry_slug=eq.${industry}&state_slug=eq.${state}&limit=1`);
  return rows[0] ?? null;
}

/** Every city in a state for one industry, A to Z. */
export function getStateCities(industry: string, state: string, total: number): Promise<CityLink[]> {
  if (!SLUG.test(industry) || !SLUG.test(state)) return Promise.resolve([]);
  return queryAll<CityLink>("ryzon_landing_city_pages", `select=city_slug,city_name&industry_slug=eq.${industry}&state_slug=eq.${state}&order=city_name,city_slug`, total);
}

export async function getCityPage(industry: string, state: string, city: string): Promise<CityPage | null> {
  if (!SLUG.test(industry) || !SLUG.test(state) || !SLUG.test(city)) return null;
  const rows = await query<CityPage>(
    "ryzon_landing_city_pages",
    `select=*&industry_slug=eq.${industry}&state_slug=eq.${state}&city_slug=eq.${city}&limit=1`,
  );
  return rows[0] ?? null;
}

/** The page's nearby towns that have their own page, closest first. */
export async function getNearbyLinks(page: CityPage): Promise<CityLink[]> {
  const names = (page.nearby_cities ?? "").split("|").map((n) => n.trim()).filter(Boolean).slice(0, 6);
  if (!names.length) return [];
  const list = names.map((n) => `"${n.replace(/["\\]/g, "")}"`).join(",");
  const rows = await query<CityLink>(
    "ryzon_landing_city_pages",
    `select=city_slug,city_name&industry_slug=eq.${page.industry_slug}&state_slug=eq.${page.state_slug}&city_name=in.(${encodeURIComponent(list)})`,
  );
  const seen = new Set<string>();
  return names.flatMap((n) => {
    const hit = rows.find((r) => r.city_name === n && !seen.has(r.city_slug));
    if (!hit) return [];
    seen.add(hit.city_slug);
    return [hit];
  });
}

/** All city URLs for one industry, for its sitemap. */
export async function getIndustrySitemapRows(industry: string): Promise<{ state_slug: string; city_slug: string; updated_at: string }[]> {
  if (!SLUG.test(industry)) return [];
  const states = await getStatePages(industry);
  const total = states.reduce((n, s) => n + s.city_count, 0);
  return queryAll("ryzon_landing_city_pages", `select=state_slug,city_slug,updated_at&industry_slug=eq.${industry}&order=state_slug,city_slug`, total);
}

// ---------------------------------------------------------------- URLs and helpers

export const industryPath = (industry: string) => `${LOCATIONS_PATH}/${industry}`;
export const statePath = (industry: string, state: string) => `${LOCATIONS_PATH}/${industry}/${state}`;
export const cityPath = (industry: string, state: string, city: string) => `${LOCATIONS_PATH}/${industry}/${state}/${city}`;
export const absolute = (path: string) => `${siteUrl}${path}`;

/** Google shows about 60 characters; the brand only goes on when it still fits. */
export function pageTitle(base: string): string {
  const withBrand = `${base} | ${site.business.name}`;
  return withBrand.length <= 60 ? withBrand : base;
}

export function splitList(value: string, sep = ";"): string[] {
  return value.split(sep).map((s) => s.trim()).filter(Boolean);
}

/** FaqList wants {id, q, a}. */
export function faqItems(faqs: Faq[]) {
  return faqs.map((f, i) => ({ id: `loc-${i + 1}`, q: f.question, a: f.answer }));
}

export function faqSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

/** Groups cities under their first letter, for the state page's A-Z list. */
export function byLetter(cities: CityLink[]): [string, CityLink[]][] {
  const groups = new Map<string, CityLink[]>();
  for (const c of cities) {
    const letter = c.city_name.charAt(0).toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), c]);
  }
  return [...groups.entries()];
}
