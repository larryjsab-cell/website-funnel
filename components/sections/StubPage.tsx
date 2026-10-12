import type { Metadata } from "next";
import { CtaButton } from "@/components/ui/CtaButton";
import { Heading } from "@/components/ui/Heading";
import { Container } from "@/components/ui/Container";
import { OfferLine } from "@/components/ui/OfferLine";
import { ui } from "@/lib/content";

type Route = keyof typeof ui.stubs.pages;

/** Temporary page until Phase 3. Keeps every nav and CTA link resolvable. */
export function stubMetadata(route: Route): Metadata {
  const page = ui.stubs.pages[route];
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: route },
    robots: { index: false, follow: true },
  };
}

export function StubPage({ route, showCta = true }: { route: Route; showCta?: boolean }) {
  const page = ui.stubs.pages[route];
  return (
    <section aria-labelledby="stub-heading" className="py-16 md:py-24">
      <Container>
        <Heading as="h1" id="stub-heading" size="display">
          {page.title}
        </Heading>
        <p className="mt-6 max-w-measure text-lg">{page.description}</p>
        <OfferLine className="mt-8 max-w-measure" />
        <p className="mt-8 max-w-measure border-2 border-dashed border-accent bg-surface p-4 font-mono text-sm text-accent mono-semi">
          {ui.stubs.note}
        </p>
        {showCta && (
          <div className="mt-8">
            <CtaButton location={`stub${route.replace(/\//g, "_")}`} size="lg" />
          </div>
        )}
      </Container>
    </section>
  );
}
