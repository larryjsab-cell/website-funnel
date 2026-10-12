import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

/** The 3-step process. A real sequence, so it gets numbers. */
export function HowItWorks() {
  const s = landing.steps;
  return (
    <Section id="how-it-works">
      <Heading id="how-it-works-heading">{s.heading}</Heading>
      <p className="mt-4 max-w-measure text-lg">{s.intro}</p>

      <ol className="rz-steps mt-10 grid md:grid-cols-3">
        {s.items.map((step, i) => (
          <li
            key={step.title}
            className={`rz-step border-t-2 border-ink pb-8 pt-4 md:pb-0 md:pr-6 ${i > 0 ? "md:border-l-2 md:pl-6" : ""}`}
          >
            <span aria-hidden="true" className="rz-step-num block font-display text-6xl font-heavy leading-none display-tight">
              {i + 1}
            </span>
            <h3 className="mt-4 font-display text-xl font-heavy display-tight">
              <span className="sr-only">{`${s.stepLabel} ${i + 1}: `}</span>
              {step.title}
            </h3>
            <p className="mt-2 max-w-measure text-base">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="rz-timeline mt-12 overflow-hidden rounded-card border-2 border-ink bg-surface">
        <h3 className="border-b-2 border-ink px-4 py-3 font-display text-lg font-heavy display-tight md:px-6">
          {s.timelineHeading}
        </h3>
        <dl className="grid md:grid-cols-3">
          {s.timeline.map((t, i) => (
            <div key={t.when} className={`px-4 py-4 md:px-6 ${i > 0 ? "border-t-2 border-ink md:border-l-2 md:border-t-0" : ""}`}>
              <dt className="font-display text-base font-bold display-ui">{t.when}</dt>
              <dd className="mt-1 text-base text-muted">{t.what}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10">
        <CtaButton location="how_it_works" label={s.ctaLabel} />
      </div>
    </Section>
  );
}
