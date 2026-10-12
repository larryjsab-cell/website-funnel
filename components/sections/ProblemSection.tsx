import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { landing } from "@/lib/content";

export function ProblemSection() {
  const p = landing.problem;
  return (
    <Section id="problem">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Heading id="problem-heading">{p.heading}</Heading>
          <p className="mt-4 max-w-measure text-lg">{p.intro}</p>
          <div className="mt-8">
            <CtaButton location="problem" label={p.ctaLabel} />
          </div>
        </div>
        <ul className="grid overflow-hidden rounded-card border-2 border-ink bg-surface sm:grid-cols-2 lg:col-span-7">
          {p.points.map((pt, i) => (
            <li
              key={pt.title}
              className={`p-5 md:p-6 ${i > 0 ? "border-t-2 border-ink" : ""} ${
                i === 1 ? "sm:border-l-2 sm:border-t-0" : ""
              } ${i === 3 ? "sm:border-l-2" : ""}`}
            >
              <h3 className="font-display text-xl font-heavy display-tight">{pt.title}</h3>
              <p className="mt-2 text-base">{pt.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
