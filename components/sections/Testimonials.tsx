import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { landing, testimonials } from "@/lib/content";
import { isPlaceholder } from "@/lib/site";

/** Real testimonials only. Placeholder tokens render until supplied. */
export function Testimonials() {
  return (
    <Section id="testimonials">
      <Heading id="testimonials-heading">{landing.testimonials.heading}</Heading>
      <ul className="rz-quotes mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.items.map((t, i) => {
          const pending = isPlaceholder(t.quote);
          return (
            <li key={i} data-placeholder-text={pending ? t.quote : undefined}>
              <figure
                className={`rz-card rz-quote h-full break-words rounded-card border-2 bg-surface p-6 ${pending ? "border-dashed border-accent" : "border-ink shadow-hard"}`}
              >
                <blockquote className={`font-display text-xl font-bold display-tight ${pending ? "text-accent" : ""}`}>
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption className="mt-6 text-base">
                  <span className="block font-semibold">{t.name}</span>
                  <span className="block text-muted">{t.business}</span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
