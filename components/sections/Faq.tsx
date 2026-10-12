import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { FaqList } from "@/components/sections/FaqList";
import { faq, landing } from "@/lib/content";

/** Every objection, grouped. Native <details>, works without JS. */
export function Faq() {
  return (
    <Section id="faq" tone="surface">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Heading id="faq-heading">{landing.faq.heading}</Heading>
        </div>
        <div className="grid gap-10 lg:col-span-8">
          {faq.groups.map((g) => (
            <div key={g.id}>
              <h3 className="mb-3 font-mono text-lg font-heavy text-muted mono-condensed">{g.title}</h3>
              <FaqList items={g.items} headingLevel="h4" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
