import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
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
import { JsonLd } from "@/components/seo/JsonLd";
import { landing } from "@/lib/content";
import { homeGraph } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";
import { alt as ogAlt } from "@/app/opengraph-image";

export const metadata: Metadata = pageMeta({ title: landing.meta.title, description: landing.meta.description, path: "/", image: { alt: ogAlt } });

/** Single-page funnel. Nav links scroll to sections; every primary CTA lands on #demo. */
export default function HomePage() {
  return (
    <>
      <JsonLd data={homeGraph()} />
      <Hero />
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
