import { CtaButton } from "@/components/ui/CtaButton";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { OfferLine } from "@/components/ui/OfferLine";
import { HeroMockup } from "@/components/sections/HeroMockup";
import { site } from "@/lib/site";
import { landing } from "@/lib/content";

type Props = {
  /** Referral pages: a line above the headline naming who sent the visitor. */
  eyebrow?: string;
  headline?: string;
  subhead?: string;
};

export function Hero({ eyebrow, headline, subhead }: Props = {}) {
  const h = landing.hero;
  return (
    <section aria-labelledby="hero-heading" className="rz-hero relative pb-16 pt-6 xs:pt-8 md:pb-24 md:pt-16">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className="lg:col-span-6">
          {eyebrow && (
            <p className="mb-4 inline-flex items-center rounded-ui border-2 border-ink bg-cta px-3 py-1 font-display text-sm font-bold text-on-cta display-ui">
              {eyebrow}
            </p>
          )}
          <Heading as="h1" id="hero-heading" size="display">
            {headline ?? h.headline}
          </Heading>
          <p className="rz-lede mt-4 max-w-measure text-base text-pretty xs:text-lg md:mt-6">{subhead ?? h.subhead}</p>
          <OfferLine className="mt-5 max-w-measure md:mt-6" />
          <div data-cta-bar-after="" className="mt-5 md:mt-6">
            <CtaButton location="hero" size="lg" label={h.ctaLabel} className="w-full sm:w-auto" />
            <p className="rz-micro mt-3 font-display text-sm text-muted display-ui">{site.cta.microcopy}</p>
          </div>
        </div>
        <div className="lg:col-span-6">
          <HeroMockup />
        </div>
      </Container>
    </section>
  );
}
