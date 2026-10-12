import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { site, formatAddress } from "@/lib/site";
import { ui } from "@/lib/content";

const linkClass =
  "inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-fast hover:underline hover:decoration-2";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-content border-t-2 border-ink bg-band text-on-band">
      <Container className="grid gap-10 py-16 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <Wordmark onInk />
          <p className="mt-4 max-w-measure text-base">{site.business.tagline}</p>
          <p className="mt-2 text-base">{ui.footer.serviceArea}</p>
        </div>

        <nav aria-label={ui.footer.pagesHeading} className="md:col-span-3">
          <h2 className="font-display text-sm font-bold display-ui">{ui.footer.pagesHeading}</h2>
          <ul className="mt-3 font-display text-sm">
            <li>
              <Link href={site.cta.primary.href} className={linkClass}>
                {site.cta.primary.label}
              </Link>
            </li>
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-5">
          <h2 className="font-display text-sm font-bold display-ui">{ui.footer.contactHeading}</h2>
          <address className="mt-3 grid gap-1 text-base not-italic">
            <span>{site.business.name}</span>
            <span>{formatAddress()}</span>
            <a href={site.business.phoneHref} className={linkClass}>
              {site.business.phone}
            </a>
            <a href={`mailto:${site.business.email}`} className={`${linkClass} break-all`}>
              {site.business.email}
            </a>
          </address>
          <h2 className="mt-6 font-display text-sm font-bold display-ui">{ui.footer.hoursHeading}</h2>
          <p className="mt-2 text-base">{site.business.hours.label}</p>
        </div>

      </Container>

      <Container>
        <div className="flex flex-col gap-2 border-t border-muted py-6 font-display text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {site.business.name}. {ui.footer.rights}
        </p>
        <nav aria-label={ui.footer.legalLabel}>
          <ul className="flex gap-4">
            {site.legal.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        </div>
      </Container>
    </footer>
  );
}
