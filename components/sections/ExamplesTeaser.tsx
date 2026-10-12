import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { TextLink } from "@/components/ui/TextLink";
import { ExampleCard } from "@/components/sections/ExampleCard";
import { examples, landing } from "@/lib/content";

export function ExamplesTeaser({ count = 3 }: { count?: number }) {
  const e = landing.examples;
  return (
    <Section id="examples" tone="surface">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Heading id="examples-heading">{e.heading}</Heading>
          <p className="mt-4 max-w-measure text-lg">{e.intro}</p>
        </div>
        <TextLink href="/examples" className="shrink-0">
          {e.linkLabel}
        </TextLink>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {examples.items.slice(0, count).map((item) => (
          <ExampleCard key={item.id} item={item} href={`/examples#${item.id}`} />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{examples.note}</p>
      <div className="mt-8">
        <CtaButton location="examples_teaser" label={e.ctaLabel} />
      </div>
    </Section>
  );
}
