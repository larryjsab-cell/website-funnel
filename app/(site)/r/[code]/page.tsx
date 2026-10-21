import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hero } from "@/components/sections/Hero";
import { ReferralTag } from "@/components/sections/ReferralTag";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { OfferStack } from "@/components/sections/OfferStack";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Examples } from "@/components/sections/Examples";
import { StyleSwitcher } from "@/components/sections/StyleSwitcher";
import { Testimonials } from "@/components/sections/Testimonials";
import { Pricing } from "@/components/sections/Pricing";
import { RiskReversal } from "@/components/sections/RiskReversal";
import { Faq } from "@/components/sections/Faq";
import { DemoSection } from "@/components/sections/DemoSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { getReferrer, REFERRAL_CODE, type PublicReferrer } from "@/lib/referral";
import { alt as ogAlt } from "@/app/opengraph-image";
import { site } from "@/lib/site";

export const revalidate = 300; // seconds; matches REFERRAL_REVALIDATE (segment config must be a literal)
// Referrers are added in the dashboard after the build; each link renders on first visit.
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ code: string }> };

function sender(r: PublicReferrer | undefined) {
  if (!r) return "A friend";
  return r.business_name ? `${r.first_name} from ${r.business_name}` : r.first_name;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const r = await getReferrer(code);
  const who = r ? r.first_name : "A friend";
  const title = `${who} sent you a free website demo | ${site.business.name}`;
  const description = "We design a free preview of your new website before you pay anything. Plans from $40/month with a $0 design fee.";
  return {
    title: { absolute: title },
    description,
    // Personal links stay out of search results; the home page is the indexed version.
    robots: { index: false, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: site.business.name,
      locale: site.site.locale,
      url: `/r/${code.toLowerCase()}`,
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: "/twitter-image", alt: ogAlt }] },
  };
}

/** A referrer's personal link: the full sales page, opened by who sent the visitor. */
export default async function ReferralPage({ params }: Params) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  const r = await getReferrer(code);
  // Unknown or turned-off links go to the home page. A failed lookup (undefined) still
  // tags the visit, so a database hiccup never loses the referral.
  if (r === null || !REFERRAL_CODE.test(code)) redirect("/");
  const who = sender(r);

  return (
    <>
      <ReferralTag code={r?.code ?? code} />
      <Hero
        eyebrow={`${who} sent you`}
        headline={r ? `${r.first_name} thinks your business deserves a better website.` : undefined}
        subhead="We design a free preview of your new site first. You see it before you pay anything, and you decide from there."
      />
      <TrustStrip />
      <ProblemSection />
      <OfferStack />
      <HowItWorks />
      <Examples />
      <StyleSwitcher />
      <Testimonials />
      <Pricing />
      <RiskReversal />
      <Faq />
      <DemoSection />
      <ContactSection />
    </>
  );
}
