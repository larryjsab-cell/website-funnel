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
        <p className="rz-callout rounded-card border-2 border-dashed border-on-band p-4 font-display text-lg font-bold display-ui lg:col-span-5">
          {p.limitedTime}
        </p>
      </div>

      <ul className="rz-plans mt-10 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => {
          const featured = t.featured;
          return (
            <li
              key={t.id}
              className={`rz-card rz-plan ${featured ? "rz-plan-featured" : ""} flex flex-col rounded-card border-2 p-6 ${
                featured ? "border-on-band bg-surface text-ink" : "border-on-band text-on-band"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-xl font-heavy display-tight">{t.name}</h3>
                {featured && (
                  <span className="rz-badge shrink-0 rounded-ui border-2 border-ink px-2 font-display text-sm font-bold display-ui">{p.featuredLabel}</span>
                )}
              </div>
              <p className="rz-price mt-4 font-display font-heavy leading-none lining-nums tabular-nums display-tight">
                <span className="text-5xl">{formatPrice(t.monthly)}</span>
                <span className="text-xl">{p.perMonth}</span>
              </p>
              <p className="mt-2 font-display text-sm display-ui">
                {fill(p.orYearly, { price: `${formatPrice(t.yearly)}${p.perYear}` })}
              </p>
              <p className="mt-1 font-display text-sm font-bold display-ui">{t.upfront}</p>
              <p className="mt-4 text-base">{t.summary}</p>
              {t.inheritsFrom && (
                <p className="mt-4 font-display text-sm font-bold display-ui">{fill(p.everything, { plan: t.inheritsFrom })}</p>
              )}
              <ul className={`rz-checklist mt-3 grid gap-2 border-t-2 pt-4 ${featured ? "border-ink" : "border-on-band"}`}>
                {t.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-base">
                    <span aria-hidden="true" className="rz-mark font-display font-bold">
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

      <p className="mt-6 font-display text-lg font-bold display-ui">{site.offer.yearlyDiscount}</p>

      <dl className="rz-terms mt-10 grid gap-0 border-t-2 border-on-band md:grid-cols-3">
        {p.terms.map((term, i) => (
          <div key={term.title} className={`py-5 md:pr-6 ${i > 0 ? "border-t-2 border-on-band md:border-l-2 md:border-t-0 md:pl-6" : ""}`}>
            <dt className="font-display text-lg font-heavy display-tight">{term.title}</dt>
            <dd className="mt-2 text-base">{term.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
