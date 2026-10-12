import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { OfferLine } from "@/components/ui/OfferLine";
import { Section } from "@/components/ui/Section";
import { site } from "@/lib/site";
import { landing } from "@/lib/content";

type Props = { heading?: string; body?: string; ctaLabel?: string; location?: string };

export function FinalCta({
  heading = landing.finalCta.heading,
  body = landing.finalCta.body,
  ctaLabel = landing.finalCta.ctaLabel,
  location = "final_cta",
}: Props) {
  return (
    <Section id="get-started">
      <div className="max-w-wide">
        <Heading id="get-started-heading" size="display">
          {heading}
        </Heading>
        <p className="mt-6 max-w-measure text-lg">{body}</p>
        <OfferLine className="mt-8 max-w-measure" />
        <div className="mt-8">
          <CtaButton location={location} size="lg" label={ctaLabel} className="w-full sm:w-auto" />
          <p className="mt-3 font-mono text-sm text-muted mono-semi">{site.cta.microcopy}</p>
        </div>
      </div>
    </Section>
  );
}
