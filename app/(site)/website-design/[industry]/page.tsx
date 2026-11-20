import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Block, LinkGrid, LocationCta, LocationHero, PlanStrip } from "@/components/locations/LocationParts";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { absolute, getIndustries, getStatePages, industryPath, LOCATIONS_PATH, locationsEnabled, pageTitle, statePath } from "@/lib/locations";
import { breadcrumbs } from "@/lib/schema";
import { site } from "@/lib/site";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { params: Promise<{ industry: string }> };

export function generateStaticParams() {
  return [];
}

async function load(params: Params["params"]) {
  if (!locationsEnabled()) return null;
  const { industry } = await params;
  const all = await getIndustries();
  return all.find((i) => i.slug === industry) ?? null;
}

const describe = (plural: string) =>
  `Websites for ${plural} in every US state, built for phones and local search. See a free design demo of your new site before you pay.`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const industry = await load(params);
  if (!industry) return { title: "Page not found", robots: { index: false } };
  const url = absolute(industryPath(industry.slug));
  const title = pageTitle(`Website Design for ${industry.name}`);
  const description = describe(industry.plural);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: site.business.name, locale: site.site.locale, url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function IndustryLocationPage({ params }: Params) {
  const industry = await load(params);
  if (!industry) notFound();
  const [industries, states] = await Promise.all([getIndustries(), getStatePages(industry.slug)]);
  const location = "location_industry";
  const path = industryPath(industry.slug);
  const others = industries.filter((i) => i.slug !== industry.slug);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "CollectionPage", "@id": `${absolute(path)}#webpage`, url: absolute(path), name: `Website Design for ${industry.name}`, description: describe(industry.plural), inLanguage: "en-US" },
            breadcrumbs([
              { name: "Website design", path: LOCATIONS_PATH },
              { name: industry.name, path },
            ]),
          ],
        }}
      />

      <article>
        <LocationHero
          trail={[{ name: "Website design", href: LOCATIONS_PATH }, { name: industry.name }]}
          title={`Website Design for ${industry.name}`}
          intro={`We design, host and manage websites for ${industry.plural} across the US. Every site is built for phones first, set up for local search and made to turn visitors into calls and quote requests, and you see a free demo before you pay anything.`}
          location={location}
        />

        <Container className="grid gap-12 py-12 md:py-16">
          <Block id="includes" title={`What a ${industry.singular} website should include`}>
            <ul className="grid gap-3 md:grid-cols-2">
              {industry.site_includes.map((item) => (
                <li key={item} className="flex gap-3 rounded-ui border-2 border-ink bg-surface p-4 text-base">
                  <span aria-hidden="true" className="font-display font-bold text-accent">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Block>

          <Block id="states" title="Pick your state">
            <LinkGrid label="States" links={states.map((s) => ({ href: statePath(industry.slug, s.state_slug), text: s.state_name }))} />
          </Block>

          <Block id="plans" title="Simple monthly plans, no big design bill">
            <PlanStrip location={location} />
          </Block>

          {others.length > 0 && (
            <Block id="industries" title="Other businesses we build websites for">
              <LinkGrid label="Other industries" links={others.map((i) => ({ href: industryPath(i.slug), text: i.name }))} />
            </Block>
          )}
        </Container>
      </article>

      <LocationCta heading={`See a free demo of your ${industry.trade} website.`} location={location} />
    </>
  );
}
