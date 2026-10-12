import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { TextLink } from "@/components/ui/TextLink";
import { FaqList } from "@/components/sections/FaqList";
import { faqByIds, landing } from "@/lib/content";

export function FaqTeaser() {
  const f = landing.faqTeaser;
  return (
    <Section id="faq" tone="surface">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Heading id="faq-heading">{f.heading}</Heading>
          <TextLink href="/faq" className="mt-6">
            {f.linkLabel}
          </TextLink>
        </div>
        <div className="lg:col-span-8">
          <FaqList items={faqByIds(f.ids)} />
        </div>
      </div>
    </Section>
  );
}
