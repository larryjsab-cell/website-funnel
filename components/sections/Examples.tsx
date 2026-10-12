import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { ExampleCard } from "@/components/sections/ExampleCard";
import { examples, landing } from "@/lib/content";

export function Examples() {
  const e = landing.examples;
  return (
    <Section id="examples" tone="surface">
      <Heading id="examples-heading">{e.heading}</Heading>
      <p className="mt-4 max-w-measure text-lg">{e.intro}</p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
        {examples.items.map((item) => (
          <ExampleCard key={item.id} item={item} ctaLabel={e.cardCta} />
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">{examples.note}</p>
    </Section>
  );
}
