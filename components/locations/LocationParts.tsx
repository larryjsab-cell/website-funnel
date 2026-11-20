import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { CtaButton } from "@/components/ui/CtaButton";
import { OfferLine } from "@/components/ui/OfferLine";
import { formatPrice, site } from "@/lib/site";

export type Crumb = { name: string; href?: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="font-display text-sm display-ui">
      <ol className="flex flex-wrap items-center gap-x-2">
        {[{ name: "Home", href: "/" }, ...trail].map((c, i, all) => (
          <li key={`${c.name}-${i}`} className="flex items-center gap-x-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page">{c.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The ink band at the top of every location page. */
export function LocationHero({ trail, title, intro, location }: { trail: Crumb[]; title: string; intro: string; location: string }) {
  return (
    <header className="border-b-2 border-ink bg-band text-on-band">
      <Container className="py-12 md:py-16">
        <Breadcrumbs trail={trail} />
        <h1 className="mt-6 max-w-4xl font-display text-3xl font-heavy text-balance display-tight sm:text-4xl md:text-5xl">{title}</h1>
        <p className="mt-6 max-w-measure text-lg md:text-xl">{intro}</p>
        <div className="mt-8 flex max-w-xl flex-col gap-4">
          <OfferLine onInk />
          <div className="flex flex-wrap items-center gap-4">
            <CtaButton location={`${location}_hero`} size="lg" onInk />
            <p className="font-display text-sm display-ui">{site.cta.microcopy}</p>
          </div>
        </div>
      </Container>
    </header>
  );
}

/** A titled block inside the page body. */
export function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="border-t-2 border-ink pt-10">
      <h2 id={`${id}-heading`} className="font-display text-2xl font-heavy display-tight md:text-3xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** The plans, from site.config.json, so prices here always match the pricing section. */
export function PlanStrip({ location }: { location: string }) {
  return (
    <div>
      <ul className="grid gap-4 md:grid-cols-3">
        {site.pricing.tiers.map((t) => (
          <li key={t.id} className="rounded-card border-2 border-ink bg-surface p-6 shadow-hard">
            <p className="font-display text-lg font-bold display-ui">{t.name}</p>
            <p className="mt-2 font-display text-3xl font-heavy display-tight">
              {formatPrice(t.monthly)}
              <span className="text-base font-bold">/mo</span>
            </p>
            <p className="mt-3 text-base">{t.summary}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-measure text-base">
        {site.offer.upfrontNote} {site.offer.yearlyDiscount}
      </p>
      <div className="mt-6">
        <CtaButton location={`${location}_plans`} variant="secondary" />
      </div>
    </div>
  );
}

/** Closing band. */
export function LocationCta({ heading, location }: { heading: string; location: string }) {
  return (
    <section aria-labelledby="location-cta-heading" className="border-t-2 border-ink bg-band py-16 text-on-band">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-measure">
          <h2 id="location-cta-heading" className="font-display text-2xl font-heavy display-tight sm:text-3xl">
            {heading}
          </h2>
          <p className="mt-3 text-lg">
            {site.offer.line.join(" · ")}. {site.cta.microcopy}
          </p>
        </div>
        <CtaButton location={`${location}_cta`} size="lg" onInk />
      </Container>
    </section>
  );
}

/** A wrapping list of links, used for cities, nearby towns and other industries. */
export function LinkGrid({ links, label }: { links: { href: string; text: string }[]; label: string }) {
  return (
    <ul aria-label={label} className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent">
            {l.text}
          </Link>
        </li>
      ))}
    </ul>
  );
}
