import { ContactForm } from "@/components/forms/ContactForm";
import { Heading } from "@/components/ui/Heading";
import { Section } from "@/components/ui/Section";
import { formatAddress, site } from "@/lib/site";
import { landing } from "@/lib/content";

const linkClass = "font-display text-lg font-bold underline decoration-2 underline-offset-4 hover:text-accent";

/** Plain-text contact facts (readable by people, crawlers and agents) + a short form. */
export function ContactSection() {
  const c = landing.contact;
  const b = site.business;
  return (
    <Section id="contact" tone="surface">
      <div data-hide-cta-bar="" className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Heading id="contact-heading">{c.heading}</Heading>
          <p className="mt-4 max-w-measure text-lg">{c.intro}</p>
          <dl className="mt-8 grid gap-5">
            <div>
              <dt className="font-display text-sm text-muted display-ui">{c.callLabel}</dt>
              <dd className="mt-1">
                <a href={b.phoneHref} className={`${linkClass} inline-flex min-h-11 items-center`}>
                  {b.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-display text-sm text-muted display-ui">{c.emailLabel}</dt>
              <dd className="mt-1">
                <a href={`mailto:${b.email}`} className={`${linkClass} inline-flex min-h-11 items-center break-all`}>
                  {b.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-display text-sm text-muted display-ui">{c.hoursLabel}</dt>
              <dd className="mt-1 text-lg">{b.hours.label}</dd>
            </div>
            <div>
              <dt className="font-display text-sm text-muted display-ui">{c.areaLabel}</dt>
              <dd className="mt-1 text-lg">{b.serviceArea}</dd>
            </div>
            <div>
              <dt className="font-display text-sm text-muted display-ui">{c.addressLabel}</dt>
              <dd className="mt-1 text-lg">{formatAddress()}</dd>
            </div>
          </dl>
        </div>
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}
