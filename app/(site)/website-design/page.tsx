import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Block, LinkGrid, LocationCta, LocationHero } from "@/components/locations/LocationParts";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { absolute, getIndustries, industryPath, LOCATIONS_PATH, locationsEnabled, pageTitle } from "@/lib/locations";
import { breadcrumbs } from "@/lib/schema";
import { site } from "@/lib/site";

export const revalidate = 86400;

const TITLE = "Website Design by Industry";
const DESCRIPTION =
  "Websites for plumbers, HVAC companies, roofers, electricians and landscapers across the US, built for phones and local search. See a free demo first.";

export function generateMetadata(): Metadata {
  if (!locationsEnabled()) return { title: "Page not found", robots: { index: false } };
  const url = absolute(LOCATIONS_PATH);
  const title = pageTitle(TITLE);
  return {
    title: { absolute: title },
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: site.business.name, locale: site.site.locale, url, title, description: DESCRIPTION },
  };
}

export default async function LocationsHub() {
  if (!locationsEnabled()) notFound();
  const industries = await getIndustries();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "CollectionPage", "@id": `${absolute(LOCATIONS_PATH)}#webpage`, url: absolute(LOCATIONS_PATH), name: TITLE, description: DESCRIPTION, inLanguage: "en-US" },
            breadcrumbs([{ name: "Website design", path: LOCATIONS_PATH }]),
          ],
        }}
      />
      <article>
        <LocationHero
          trail={[{ name: "Website design" }]}
          title={TITLE}
          intro="Local service businesses win work when nearby customers can find them, trust them and call them fast. We build websites for the trades that do exactly that, on a simple monthly plan."
          location="location_hub"
        />
        <Container className="grid gap-12 py-12 md:py-16">
          <Block id="industries" title="Pick your industry">
            <LinkGrid label="Industries" links={industries.map((i) => ({ href: industryPath(i.slug), text: `Website design for ${i.plural}` }))} />
          </Block>
        </Container>
      </article>
      <LocationCta heading="See a free demo of your new website." location="location_hub" />
    </>
  );
}
