import type { Metadata } from "next";
import { CtaButton } from "@/components/ui/CtaButton";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/TextLink";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ui } from "@/lib/content";

export const metadata: Metadata = { title: ui.notFound.title, robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="relative z-content py-16 md:py-24">
        <Container>
          <Heading as="h1" size="display">
            {ui.notFound.heading}
          </Heading>
          <p className="mt-6 max-w-measure text-lg">{ui.notFound.body}</p>
          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <CtaButton location="not_found" size="lg" />
            <TextLink href="/">{ui.notFound.homeLabel}</TextLink>
          </div>
        </Container>
      </main>
    </>
  );
}
