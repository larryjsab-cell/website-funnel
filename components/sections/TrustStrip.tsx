import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

/** Real facts first; unverified proof stays as visible placeholders. */
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
        {t.facts.map((f) => (
          <li key={f.value} className={`${cell} md:col-span-2 xl:col-span-1`}>
            <p className="font-display text-lg font-heavy display-tight xs:text-xl md:text-2xl">{f.value}</p>
            <p className="mt-1 text-base text-muted">{f.label}</p>
          </li>
        ))}
        {t.placeholders.map((p) => (
          <li key={p.token} data-placeholder-text={p.token} className={`${cell} last:col-span-2 md:col-span-3 md:last:col-span-3 xl:col-span-1 xl:last:col-span-1`}>
            <p className="font-display text-base font-bold text-accent display-ui ui-condensed">
              {/* Allow the token to wrap at its underscore, not mid-word. */}
              {p.token.replace(/_/g, "_\u200B")}
            </p>
            <p className="mt-1 text-base text-muted">{p.label}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
