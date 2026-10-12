import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { OfferStack } from "@/components/sections/OfferStack";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ExamplesTeaser } from "@/components/sections/ExamplesTeaser";
import { Testimonials } from "@/components/sections/Testimonials";
import { PricingTeaser } from "@/components/sections/PricingTeaser";
import { RiskReversal } from "@/components/sections/RiskReversal";
import { FaqTeaser } from "@/components/sections/FaqTeaser";
import { FinalCta } from "@/components/sections/FinalCta";
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

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <OfferStack />
      <HowItWorks />
      <ExamplesTeaser />
      <Testimonials />
      <PricingTeaser />
      <RiskReversal />
      <FaqTeaser />
      <FinalCta />
    </>
  );
}
