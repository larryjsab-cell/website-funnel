import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Block, LinkGrid, LocationCta, LocationHero, PlanStrip } from "@/components/locations/LocationParts";
import { LocationMap } from "@/components/locations/LocationMap";
import { FaqList } from "@/components/sections/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import {
  absolute,
  cityPath,
  faqItems,
  faqSchema,
  getCityPage,
  getIndustries,
  getNearbyLinks,
  industryPath,
  LOCATIONS_PATH,
  locationsEnabled,
  pageTitle,
  splitList,
  statePath,
} from "@/lib/locations";
import { businessId, breadcrumbs } from "@/lib/schema";
import { site } from "@/lib/site";

export const revalidate = 86400; // matches LOCATION_REVALIDATE (segment config must be a literal)
// About 96,000 pages: none are built ahead of time; each renders on its first visit, then stays cached.
export const dynamicParams = true;

type Params = { params: Promise<{ industry: string; state: string; city: string }> };

export function generateStaticParams() {
  return [];
}

async function load(params: Params["params"]) {
  if (!locationsEnabled()) return null;
  const { industry, state, city } = await params;
  return getCityPage(industry, state, city);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await load(params);
  if (!page) return { title: "Page not found", robots: { index: false } };
  const url = absolute(cityPath(page.industry_slug, page.state_slug, page.city_slug));
  const title = pageTitle(page.meta_title);
  return {
    title: { absolute: title },
    description: page.meta_description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: site.business.name, locale: site.site.locale, url, title, description: page.meta_description },
    twitter: { card: "summary_large_image", title, description: page.meta_description },
  };
}

export default async function CityLocationPage({ params }: Params) {
  const page = await load(params);
  if (!page) notFound();

  const [industries, nearby] = await Promise.all([getIndustries(), getNearbyLinks(page)]);
  const industry = industries.find((i) => i.slug === page.industry_slug);
  if (!industry) notFound();

  const place = `${page.city_name}, ${page.state_code}`;
  const path = cityPath(page.industry_slug, page.state_slug, page.city_slug);
  const title = `Website Design for ${industry.name} in ${place}`;
  const location = "location_city";
  const others = industries.filter((i) => i.slug !== industry.slug);

  const trail = [
    { name: "Website design", href: LOCATIONS_PATH },
    { name: industry.name, href: industryPath(industry.slug) },
    { name: page.state_name, href: statePath(industry.slug, page.state_slug) },
    { name: page.city_name },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${absolute(path)}#webpage`,
        url: absolute(path),
        name: page.meta_title,
        description: page.meta_description,
        inLanguage: "en-US",
        about: { "@id": businessId },
      },
      {
        "@type": "Service",
        "@id": `${absolute(path)}#service`,
        name: `Website design for ${industry.plural} in ${place}`,
        serviceType: "Website design",
        audience: { "@type": "BusinessAudience", audienceType: industry.plural },
        provider: { "@id": businessId },
        areaServed: {
          "@type": "City",
          name: page.city_name,
          ...(page.lat != null && page.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: page.lat, longitude: page.lng } } : {}),
          containedInPlace: { "@type": "State", name: page.state_name },
        },
      },
      breadcrumbs([
        { name: "Website design", path: LOCATIONS_PATH },
        { name: industry.name, path: industryPath(industry.slug) },
        { name: page.state_name, path: statePath(industry.slug, page.state_slug) },
        { name: page.city_name, path },
      ]),
    ],
  };

  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={faqSchema(page.faqs)} />

      <article>
        <LocationHero trail={trail} title={title} intro={page.unique_intro} location={location} />

        <Container className="grid gap-12 py-12 md:py-16">
          <Block id="local" title={`Getting found by customers in ${page.city_name}`}>
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div className="grid max-w-measure gap-4 text-lg">
                <p>{page.city_context}</p>
                <p>{page.search_note}</p>
              </div>
              <LocationMap
                query={page.lat != null && page.lng != null ? `${page.lat},${page.lng}` : `${page.city_name}, ${page.state_name}`}
                zoom={12}
                title={`Map of ${place}`}
              />
            </div>
          </Block>

          <Block id="includes" title={`What a ${industry.singular} website in ${page.city_name} should include`}>
            <ul className="grid gap-3 md:grid-cols-2">
              {splitList(page.site_includes).map((item) => (
                <li key={item} className="flex gap-3 rounded-ui border-2 border-ink bg-surface p-4 text-base">
                  <span aria-hidden="true" className="font-display font-bold text-accent">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-measure text-base">
              Every plan includes a professional, mobile-friendly site with SEO and analytics. Growth adds business automations, custom dashboards and traffic
              tracking, so a new request from a {page.city_name} customer can reach your phone right away.
            </p>
          </Block>

          <Block id="plans" title="Simple monthly plans, no big design bill">
            <PlanStrip location={location} />
          </Block>

          <Block id="faq" title={`${industry.label} website questions from ${page.city_name}`}>
            <FaqList items={faqItems(page.faqs)} />
          </Block>

          {nearby.length > 0 && (
            <Block id="nearby" title={`Also serving ${industry.plural} near ${page.city_name}`}>
              <LinkGrid
                label={`Nearby ${page.state_name} towns`}
                links={nearby.map((c) => ({ href: cityPath(industry.slug, page.state_slug, c.city_slug), text: `${c.city_name}, ${page.state_code}` }))}
              />
              <p className="mt-4 text-base">
                <Link href={statePath(industry.slug, page.state_slug)} prefetch={false} className="underline underline-offset-4 hover:text-accent">
                  See every {page.state_name} city we build {industry.trade} websites for
                </Link>
              </p>
            </Block>
          )}

          {others.length > 0 && (
            <Block id="industries" title={`Other businesses we build websites for in ${page.city_name}`}>
              <LinkGrid
                label="Other industries"
                links={others.map((i) => ({ href: cityPath(i.slug, page.state_slug, page.city_slug), text: `${i.name} in ${page.city_name}` }))}
              />
            </Block>
          )}
        </Container>
      </article>

      <LocationCta heading={`See a free demo of your ${page.city_name} ${industry.trade} website.`} location={location} />
    </>
  );
}
