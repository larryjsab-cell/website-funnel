import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

export function RiskReversal() {
  const r = landing.risk;
  return (
    <Section id="risk">
      <Heading id="risk-heading" size="display" className="lg:text-7xl">
        {r.heading}
      </Heading>
      <p className="rz-lede mt-6 max-w-measure text-lg">{r.body}</p>
      <div className="mt-8">
        <CtaButton location="risk_reversal" size="lg" label={r.ctaLabel} />
      </div>
    </Section>
  );
}
