import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";

export const buttonClass =
  "inline-flex min-h-12 items-center justify-center rounded-ui border-2 border-ink px-6 text-center font-display text-sm font-bold display-ui transition-button duration-fast ease-out";
export const primaryButton = `${buttonClass} bg-cta text-on-cta shadow-hard hover:-translate-x-lift-x hover:-translate-y-lift-y hover:shadow-hard-lg active:translate-x-lift-x active:translate-y-lift-y active:shadow-none`;
export const secondaryButton = `${buttonClass} bg-transparent text-ink hover:bg-ink hover:text-on-ink active:bg-ink active:text-on-ink`;

/** A friendly full-page message: used for expired links, already-paid, thank-yous. */
export function Message({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Container>
      <div className="mx-auto max-w-wide rounded-card border-2 border-ink bg-surface p-6 shadow-hard md:p-10">
        <h1 className="font-display text-3xl font-heavy display-tight md:text-4xl">{title}</h1>
        <div className="mt-4 space-y-4 text-lg">{children}</div>
        <div className="mt-8 flex flex-wrap gap-3">
          {actions ?? (
            <>
              <a href={site.business.phoneHref} className={primaryButton}>
                Call {site.business.phone}
              </a>
              <a href={`mailto:${site.business.email}`} className={secondaryButton}>
                Email Us
              </a>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}

export function HomeLink() {
  return (
    <Link href="/" className="underline underline-offset-4">
      Back to the home page
    </Link>
  );
}
