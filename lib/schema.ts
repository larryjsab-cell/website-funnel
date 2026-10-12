/**
 * Schema.org JSON-LD, built from the same config and content the pages render,
 * so structured data can never drift from what visitors read.
 */
import { allFaqItems, landing } from "@/lib/content";
import { site, siteUrl } from "@/lib/site";

const b = site.business;
const id = (frag: string) => `${siteUrl}/#${frag}`;

const DAY = { Monday: "Mo", Tuesday: "Tu", Wednesday: "We", Thursday: "Th", Friday: "Fr", Saturday: "Sa", Sunday: "Su" } as const;

function business() {
  const tiers = site.pricing.tiers;
  return {
    "@type": "ProfessionalService",
    "@id": id("business"),
    name: b.name,
    description: landing.meta.description,
    slogan: b.tagline,
    url: `${siteUrl}/`,
    image: `${siteUrl}/opengraph-image`,
    telephone: "+1-248-974-4220",
    email: b.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address.street,
      addressLocality: b.address.city,
      addressRegion: b.address.region,
      postalCode: b.address.postalCode,
      addressCountry: b.address.country,
    },
    areaServed: { "@type": "Country", name: "United States" },
    openingHours: `${b.hours.days.map((d) => DAY[d as keyof typeof DAY]).join(",")} ${b.hours.opens}-${b.hours.closes}`,
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: b.hours.days, opens: b.hours.opens, closes: b.hours.closes },
    ],
    priceRange: `$${Math.min(...tiers.map((t) => t.monthly))}–$${Math.max(...tiers.map((t) => t.monthly))}/month`,
    currenciesAccepted: "USD",
    knowsAbout: ["Small business websites", "Website design", "Website hosting", "Local SEO", "Business automation"],
    hasOfferCatalog: { "@id": id("plans") },
  };
}

/** The plans and the free demo, as they appear in the pricing section. */
function plans() {
  return {
    "@type": "OfferCatalog",
    "@id": id("plans"),
    name: "Website plans",
    url: `${siteUrl}/#pricing`,
    itemListElement: [
      {
        "@type": "Offer",
        name: site.offer.demo,
        description: `We design a preview of your new website first, ready ${site.offer.demoTurnaround}. No credit card.`,
        price: 0,
        priceCurrency: "USD",
        url: `${siteUrl}/#demo`,
        itemOffered: { "@type": "Service", name: "Website design demo", provider: { "@id": id("business") } },
      },
      ...site.pricing.tiers.map((t) => ({
        "@type": "Offer",
        name: t.name,
        description: `${t.summary} ${site.offer.designFee}. ${site.offer.yearlyDiscount}`,
        price: t.monthly,
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
        availability: "https://schema.org/InStock",
        priceSpecification: [
          { "@type": "UnitPriceSpecification", price: t.monthly, priceCurrency: "USD", unitCode: "MON", unitText: "month" },
          { "@type": "UnitPriceSpecification", price: t.yearly, priceCurrency: "USD", unitCode: "ANN", unitText: "year" },
        ],
        itemOffered: {
          "@type": "Service",
          name: `${t.name}: website design and hosting`,
          serviceType: "Website design and hosting",
          description: [t.inheritsFrom ? `Everything in ${t.inheritsFrom}` : "", ...t.includes].filter(Boolean).join(", "),
          provider: { "@id": id("business") },
          areaServed: { "@type": "Country", name: "United States" },
        },
      })),
    ],
  };
}

function faqPage() {
  return {
    "@type": "FAQPage",
    "@id": id("faq"),
    mainEntity: allFaqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function website() {
  return { "@type": "WebSite", "@id": id("website"), url: `${siteUrl}/`, name: b.name, inLanguage: "en-US", publisher: { "@id": id("business") } };
}

export type Crumb = { name: string; path: string };

export function breadcrumbs(trail: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${siteUrl}${c.path}`,
    })),
  };
}

function webPage(path: string, name: string, description: string) {
  return {
    "@type": "WebPage",
    "@id": `${siteUrl}${path}#webpage`,
    url: `${siteUrl}${path}`,
    name,
    description,
    isPartOf: { "@id": id("website") },
    about: { "@id": id("business") },
    inLanguage: "en-US",
  };
}

/** Everything the home page describes: the business, its plans, the FAQ. */
export function homeGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [website(), business(), plans(), faqPage(), webPage("/", landing.meta.title, landing.meta.description), breadcrumbs([])],
  };
}

export function pageGraph(path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [webPage(path, name, description), breadcrumbs([{ name, path }])],
  };
}
