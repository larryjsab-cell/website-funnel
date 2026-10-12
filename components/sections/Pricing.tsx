import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { fill } from "@/lib/forms";
import { site, formatPrice } from "@/lib/site";
import { landing } from "@/lib/content";

/** Three plans on the ink band. Featured plan gets the surface treatment, not the cta color. */
export function Pricing() {
  const p = landing.pricing;
  const tiers = site.pricing.tiers;
  return (
    <Section id="pricing" tone="ink">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Heading id="pricing-heading">{p.heading}</Heading>
          <p className="mt-4 max-w-measure text-lg">{p.intro}</p>
        </div>
        <p className="border-2 border-dashed border-on-ink p-4 font-mono text-lg font-bold mono-semi lg:col-span-5">
          {p.limitedTime}
        </p>
      </div>

      <ul className="mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => {
          const featured = t.featured;
          return (
            <li
              key={t.id}
              className={`flex flex-col border-2 p-6 ${
                featured ? "border-on-ink bg-surface text-ink" : "border-on-ink text-on-ink"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-mono text-xl font-heavy mono-condensed">{t.name}</h3>
                {featured && (
                  <span className="shrink-0 border-2 border-ink px-2 font-mono text-sm font-bold mono-semi">{p.featuredLabel}</span>
                )}
              </div>
              <p className="mt-4 font-mono font-heavy leading-none tabular-nums mono-condensed">
                <span className="text-5xl">{formatPrice(t.monthly)}</span>
                <span className="text-xl">{p.perMonth}</span>
              </p>
              <p className="mt-2 font-mono text-sm mono-semi">
                {fill(p.orYearly, { price: `${formatPrice(t.yearly)}${p.perYear}` })}
              </p>
              <p className="mt-1 font-mono text-sm font-bold mono-semi">{t.upfront}</p>
              <p className="mt-4 text-base">{t.summary}</p>
              {t.inheritsFrom && (
                <p className="mt-4 font-mono text-sm font-bold mono-semi">{fill(p.everything, { plan: t.inheritsFrom })}</p>
              )}
              <ul className={`mt-3 grid gap-2 border-t-2 pt-4 ${featured ? "border-ink" : "border-on-ink"}`}>
                {t.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-base">
                    <span aria-hidden="true" className="font-mono font-bold">
                      +
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <CtaButton
                  location={`pricing_${t.id}`}
                  label={p.ctaLabel}
                  onInk={!featured}
                  fullWidth
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 font-mono text-lg font-bold mono-semi">{site.offer.yearlyDiscount}</p>

      <dl className="mt-10 grid gap-0 border-t-2 border-on-ink md:grid-cols-3">
        {p.terms.map((term, i) => (
          <div key={term.title} className={`py-5 md:pr-6 ${i > 0 ? "border-t-2 border-on-ink md:border-l-2 md:border-t-0 md:pl-6" : ""}`}>
            <dt className="font-mono text-lg font-heavy mono-condensed">{term.title}</dt>
            <dd className="mt-2 text-base">{term.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
