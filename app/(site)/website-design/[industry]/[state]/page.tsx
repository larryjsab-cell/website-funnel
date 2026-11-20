import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Block, LinkGrid, LocationCta, LocationHero, PlanStrip } from "@/components/locations/LocationParts";
import { FaqList } from "@/components/sections/FaqList";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import {
  absolute,
  byLetter,
  cityPath,
  faqItems,
  faqSchema,
  getIndustries,
  getStateCities,
  getStatePage,
  industryPath,
  LOCATIONS_PATH,
  locationsEnabled,
  pageTitle,
  statePath,
} from "@/lib/locations";
import { breadcrumbs } from "@/lib/schema";
import { site } from "@/lib/site";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ industry: string; state: string }> };

export function generateStaticParams() {
  return [];
}

async function load(params: Params["params"]) {
  if (!locationsEnabled()) return null;
  const { industry, state } = await params;
  return getStatePage(industry, state);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await load(params);
  if (!page) return { title: "Page not found", robots: { index: false } };
  const url = absolute(statePath(page.industry_slug, page.state_slug));
  const title = pageTitle(page.meta_title);
  return {
    title: { absolute: title },
    description: page.meta_description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: site.business.name, locale: site.site.locale, url, title, description: page.meta_description },
    twitter: { card: "summary_large_image", title, description: page.meta_description },
  };
}

export default async function StateLocationPage({ params }: Params) {
  const page = await load(params);
  if (!page) notFound();

  const [industries, cities] = await Promise.all([getIndustries(), getStateCities(page.industry_slug, page.state_slug, page.city_count)]);
  const industry = industries.find((i) => i.slug === page.industry_slug);
  if (!industry) notFound();

  const location = "location_state";
  const path = statePath(industry.slug, page.state_slug);
  const others = industries.filter((i) => i.slug !== industry.slug);
  const trail = [
    { name: "Website design", href: LOCATIONS_PATH },
    { name: industry.name, href: industryPath(industry.slug) },
    { name: page.state_name },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "CollectionPage", "@id": `${absolute(path)}#webpage`, url: absolute(path), name: page.meta_title, description: page.meta_description, inLanguage: "en-US" },
            breadcrumbs([
              { name: "Website design", path: LOCATIONS_PATH },
              { name: industry.name, path: industryPath(industry.slug) },
              { name: page.state_name, path },
            ]),
          ],
        }}
      />
      <JsonLd data={faqSchema(page.faqs)} />

      <article>
        <LocationHero trail={trail} title={page.hero_title} intro={page.intro} location={location} />

        <Container className="grid gap-12 py-12 md:py-16">
          <Block id="cities" title={`${page.state_name} cities and towns`}>
            <p className="max-w-measure text-lg">{page.state_context}</p>
            <div className="mt-8 grid gap-8">
              {byLetter(cities).map(([letter, group]) => (
                <div key={letter}>
                  <h3 className="font-display text-xl font-heavy display-tight">{letter}</h3>
                  <div className="mt-2">
                    <LinkGrid
                      label={`${page.state_name} cities starting with ${letter}`}
                      links={group.map((c) => ({ href: cityPath(industry.slug, page.state_slug, c.city_slug), text: c.city_name }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block id="plans" title="Simple monthly plans, no big design bill">
            <PlanStrip location={location} />
          </Block>

          <Block id="faq" title="Questions">
            <FaqList items={faqItems(page.faqs)} />
          </Block>

          {others.length > 0 && (
            <Block id="industries" title={`Other businesses we build websites for in ${page.state_name}`}>
              <LinkGrid label="Other industries" links={others.map((i) => ({ href: statePath(i.slug, page.state_slug), text: `${i.name} in ${page.state_name}` }))} />
            </Block>
          )}
        </Container>
      </article>

      <LocationCta heading={`See a free demo of your ${industry.trade} website.`} location={location} />
    </>
  );
}
