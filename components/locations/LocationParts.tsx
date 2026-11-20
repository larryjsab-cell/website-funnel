import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { CtaButton } from "@/components/ui/CtaButton";
import { OfferLine } from "@/components/ui/OfferLine";
import { TileArrow, tileClass } from "@/components/locations/tiles";
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

type HeroProps = { trail: Crumb[]; title: string; intro: string; location: string; aside?: ReactNode };

/** The ink band at the top of every location page; `aside` (the map) fills the right column. */
export function LocationHero({ trail, title, intro, location, aside }: HeroProps) {
  return (
    <header className="border-b-2 border-ink bg-band text-on-band">
      <Container className="py-12 md:py-16">
        <Breadcrumbs trail={trail} />
        <div className={`mt-6 grid gap-10 ${aside ? "lg:grid-cols-12 lg:items-center" : ""}`}>
          <div className={aside ? "lg:col-span-7" : ""}>
            <h1 className="max-w-4xl font-display text-3xl font-heavy text-balance !leading-[1.15] display-tight sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mt-6 max-w-measure text-lg md:text-xl">{intro}</p>
            <div className="mt-8 flex max-w-xl flex-col gap-4">
              <OfferLine onInk />
              <div className="flex flex-wrap items-center gap-4">
                <CtaButton location={`${location}_hero`} size="lg" onInk />
                <p className="font-display text-sm display-ui">{site.cta.microcopy}</p>
              </div>
            </div>
          </div>
          {aside && <div className="lg:col-span-5">{aside}</div>}
        </div>
      </Container>
    </header>
  );
}

/** A titled block inside the page body, with an optional lead paragraph. */
export function Block({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="border-t-2 border-ink pt-10">
      <h2 id={`${id}-heading`} className="font-display text-2xl font-heavy !leading-[1.2] display-tight md:text-3xl">
        {title}
      </h2>
      {lead && <p className="mt-4 max-w-measure text-lg">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Checklist cards: what a site for this trade should include. */
export function IncludesList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 rounded-ui border-2 border-ink bg-surface p-4 text-base">
          <span aria-hidden="true" className="font-display font-bold text-accent">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
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
          <h2 id="location-cta-heading" className="font-display text-2xl font-heavy !leading-[1.2] display-tight sm:text-3xl">
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

/** A grid of link tiles. */
export function LinkGrid({ links, label, columns = 4 }: { links: { href: string; text: string }[]; label: string; columns?: 2 | 3 | 4 }) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <ul aria-label={label} className={`grid gap-2 ${cols}`}>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} prefetch={false} className={tileClass}>
            <span className="min-w-0">{l.text}</span>
            <TileArrow />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Other businesses we build websites for": one card per industry. */
export function IndustryCards({ cards }: { cards: { href: string; name: string; note: string }[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <li key={c.href}>
          <Link
            href={c.href}
            prefetch={false}
            className="flex h-full flex-col justify-between gap-4 rounded-card border-2 border-ink bg-surface p-5 shadow-hard transition-button duration-fast hover:-translate-x-lift-x hover:-translate-y-lift-y hover:shadow-hard-lg"
          >
            <span className="font-display text-lg font-heavy !leading-[1.2] display-tight">{c.name}</span>
            <span className="font-display text-sm display-ui">{c.note} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
