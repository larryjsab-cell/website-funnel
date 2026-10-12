import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { TextLink } from "@/components/ui/TextLink";
import { landing } from "@/lib/content";

type Props = { showPageLink?: boolean; headingLevel?: "h1" | "h2" };

/** The 3-step process. A real sequence, so it gets numbers. */
export function HowItWorks({ showPageLink = true, headingLevel = "h2" }: Props) {
  const s = landing.steps;
  return (
    <Section id="how-it-works">
      <Heading as={headingLevel} id="how-it-works-heading">
        {s.heading}
      </Heading>
      <p className="mt-4 max-w-measure text-lg">{s.intro}</p>

      <ol className="mt-10 grid gap-0 md:grid-cols-3">
        {s.items.map((step, i) => (
          <li
            key={step.title}
            className={`border-t-2 border-ink pb-8 pt-4 md:pb-0 md:pr-6 ${i > 0 ? "md:border-l-2 md:pl-6" : ""}`}
          >
            <span aria-hidden="true" className="block font-mono text-6xl font-heavy leading-none mono-condensed">
              {i + 1}
            </span>
            <h3 className="mt-4 font-mono text-xl font-heavy mono-condensed">
              <span className="sr-only">{`${s.stepLabel} ${i + 1}: `}</span>
              {step.title}
            </h3>
            <p className="mt-2 max-w-measure text-base">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <CtaButton location="how_it_works" label={s.ctaLabel} />
        {showPageLink && <TextLink href="/how-it-works">{s.linkLabel}</TextLink>}
      </div>
    </Section>
  );
}
