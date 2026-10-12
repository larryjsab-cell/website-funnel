import { DemoForm } from "@/components/forms/DemoForm";
import { Heading } from "@/components/ui/Heading";
import { OfferLine } from "@/components/ui/OfferLine";
import { Section } from "@/components/ui/Section";
import { fill } from "@/lib/forms";
import { site } from "@/lib/site";
import { forms, landing } from "@/lib/content";

/** The conversion point. Every primary CTA on the page lands here. */
export function DemoSection() {
  const d = landing.demo;
  return (
    <Section id="demo">
      <div data-hide-cta-bar="" className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Heading id="demo-heading" size="display">
            {d.heading}
          </Heading>
          <p className="rz-lede mt-6 max-w-measure text-lg">{d.intro}</p>
          <OfferLine className="mt-8 max-w-measure" />
          <ul className="rz-checklist mt-6 grid gap-2">
            {d.recap.map((r) => (
              <li key={r} className="flex gap-3 font-display text-base font-bold display-ui">
                <span aria-hidden="true" className="rz-mark">+</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <DemoForm />
          <noscript>
            <p className="mt-4 rounded-card border-2 border-ink bg-surface p-4 text-base">
              {fill(forms.errors.noScript, { phone: site.business.phone, email: site.business.email })}
            </p>
          </noscript>
        </div>
      </div>
    </Section>
  );
}
