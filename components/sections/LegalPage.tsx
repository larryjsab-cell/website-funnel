import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/TextLink";
import { affiliatesEnabled } from "@/lib/affiliate";
import { site } from "@/lib/site";
import { legal } from "@/lib/content";
import { pageGraph } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";

type Doc = "privacy" | "terms";
type Block = { body?: string[]; list?: string[] };

export function legalMetadata(doc: Doc): Metadata {
  const page = legal[doc];
  return pageMeta({ title: `${page.title} | ${site.business.name}`, description: page.description, path: `/${doc}` });
}

function LegalBlock({ block }: { block: Block }) {
  if (block.list) {
    return (
      <ul className="mt-3 grid max-w-measure gap-2 text-base">
        {block.list.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="rz-mark font-display font-bold display-ui">
              +
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mt-3 grid max-w-measure gap-3 text-base">
      {block.body?.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

const anchor = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Sections tagged with a feature only show while that feature is on. */
const shown = (s: { feature?: string }) => s.feature !== "affiliates" || affiliatesEnabled();

/** Plain, readable legal text. Content lives in content/legal.json. */
export function LegalPage({ doc }: { doc: Doc }) {
  const page = legal[doc];
  return (
    <article className="py-16 md:py-24">
      <JsonLd data={pageGraph(`/${doc}`, page.title, page.description)} />
      <Container>
        <div className="max-w-wide">
          <nav aria-label="Breadcrumb" className="mb-6 font-display text-sm display-ui">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="underline underline-offset-4 hover:text-accent">
                  Home
                </Link>
                <span aria-hidden="true" className="ml-2">
                  /
                </span>
              </li>
              <li aria-current="page">{page.title}</li>
            </ol>
          </nav>
          {/* The phone demo bar waits until the title has scrolled away. */}
          <div data-cta-bar-after="">
            <Heading as="h1" size="display">
              {page.title}
            </Heading>
            <p className="mt-4 font-display text-sm text-muted display-ui">
              {legal.updatedLabel}: {legal.updated}
            </p>
          </div>
          <p className="mt-8 max-w-measure text-lg">{page.intro}</p>

          {page.sections.filter(shown).map((s) => (
            <section key={s.heading} id={anchor(s.heading)} className="scroll-mt-24 mt-10 border-t-2 border-ink pt-6">
              <h2 className="font-display text-xl font-heavy display-tight md:text-2xl">{s.heading}</h2>
              {s.blocks.map((b: Block, i) => (
                <LegalBlock key={i} block={b} />
              ))}
            </section>
          ))}

          <p className="mt-12 border-t-2 border-ink pt-6 text-base">
            {legal.contactLabel}{" "}
            <a href={`mailto:${site.business.email}`} className="font-bold underline decoration-2 underline-offset-4 hover:text-accent">
              {site.business.email}
            </a>
          </p>
          <TextLink href="/" className="mt-4">
            {legal.homeLabel}
          </TextLink>
        </div>
      </Container>
    </article>
  );
}
