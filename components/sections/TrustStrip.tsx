import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

/** Five quick facts under the hero. */
export function TrustStrip() {
  const t = landing.trust;
  const cell = "rz-trust-item min-w-0 break-words bg-surface p-3 xs:p-4 md:p-5";
  return (
    <Section id="trust" tone="surface" padding="none">
      <h2 id="trust-heading" className="sr-only">
        {t.heading}
      </h2>
      {/* 2px gaps over an ink ground draw the rules at any column count. */}
      <ul className="rz-trust grid grid-cols-2 gap-0.5 border-x-2 border-ink bg-ink md:grid-cols-6 xl:grid-cols-5">
        {t.facts.map((f, i) => (
          // Phones: pairs, the odd one out full width. md: three on top, two below. xl: one row.
          <li
            key={f.value}
            className={`${cell} ${i === t.facts.length - 1 && t.facts.length % 2 ? "col-span-2" : ""} ${i < 3 ? "md:col-span-2" : "md:col-span-3"} xl:col-span-1`}
          >
            <p className="font-display text-lg font-heavy display-tight xs:text-xl md:text-2xl">{f.value}</p>
            <p className="mt-1 text-base text-muted">{f.label}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
