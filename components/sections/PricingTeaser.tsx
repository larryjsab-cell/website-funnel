import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { site, formatPrice } from "@/lib/site";
import { landing } from "@/lib/content";

export function PricingTeaser() {
  const p = landing.pricingTeaser;
  const [starter] = site.pricing.tiers;
  return (
    <Section id="pricing" tone="ink">
      <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Heading id="pricing-heading">{p.heading}</Heading>
          <p className="mt-6 font-mono font-heavy leading-none mono-condensed">
            <span className="block text-6xl md:text-7xl">{formatPrice(starter.monthly)}/mo</span>
            <span className="mt-3 block text-2xl md:text-3xl">{starter.upfront}</span>
          </p>
          <p className="mt-6 max-w-measure text-lg">{p.body}</p>
          <p className="mt-3 max-w-measure text-lg">{site.offer.yearlyDiscount}</p>
        </div>

        <ul className="border-2 border-on-ink lg:col-span-5">
          {site.pricing.tiers.map((t, i) => (
            <li
              key={t.id}
              className={`flex items-baseline justify-between gap-4 p-4 ${i > 0 ? "border-t-2 border-on-ink" : ""}`}
            >
              <span className="font-mono text-lg font-bold mono-semi">{t.name}</span>
              <span className="font-mono text-lg font-heavy tabular-nums mono-condensed">{formatPrice(t.monthly)}/mo</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <CtaButton location="pricing_teaser" onInk />
        <CtaButton location="pricing_teaser" variant="secondary" label={p.linkLabel} onInk />
      </div>
    </Section>
  );
}
