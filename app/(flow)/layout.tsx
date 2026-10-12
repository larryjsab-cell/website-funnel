import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { site } from "@/lib/site";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Customer pages reached from emails: no sales nav, just the brand and a way to reach us. */
export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-content flex min-h-screen flex-col">
      <header className="border-b-2 border-ink bg-canvas">
        <Container className="flex min-h-14 items-center justify-between gap-4 md:min-h-16">
          <Wordmark />
          <a href={site.business.phoneHref} className="inline-flex min-h-11 items-center font-display text-sm font-bold underline-offset-4 hover:underline">
            {site.business.phone}
          </a>
        </Container>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 py-10 md:py-16">
        {children}
      </main>
      <footer className="border-t-2 border-ink bg-canvas py-6 text-sm">
        <Container className="flex flex-wrap justify-between gap-3">
          <span>
            Questions? Call{" "}
            <a href={site.business.phoneHref} className="underline underline-offset-4">
              {site.business.phone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${site.business.email}`} className="break-words underline underline-offset-4">
              {site.business.email}
            </a>
          </span>
          <span className="flex gap-4">
            <Link href="/privacy" className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-4">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-4">
              Terms
            </Link>
          </span>
        </Container>
      </footer>
    </div>
  );
}
