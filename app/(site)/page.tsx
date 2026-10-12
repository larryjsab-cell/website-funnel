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
import { landing } from "@/lib/content";

export const metadata: Metadata = {
  title: { absolute: landing.meta.title },
  description: landing.meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: landing.meta.title,
    description: landing.meta.description,
    url: "/",
    images: [landing.meta.ogImage],
  },
};

/** Single-page funnel. Nav links scroll to sections; every primary CTA lands on #demo. */
export default function HomePage() {
  return (
    <>
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
