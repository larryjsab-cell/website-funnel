import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { TextLink } from "@/components/ui/TextLink";
import { site } from "@/lib/site";
import { legal } from "@/lib/content";

type Doc = "privacy" | "terms";
type Block = { body?: string[]; list?: string[] };

export function legalMetadata(doc: Doc): Metadata {
  const page = legal[doc];
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${doc}` },
    openGraph: { title: page.title, description: page.description, url: `/${doc}` },
  };
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

/** Plain, readable legal text. Content lives in content/legal.json. */
export function LegalPage({ doc }: { doc: Doc }) {
  const page = legal[doc];
  return (
    <article className="py-16 md:py-24">
      <Container>
        <div className="max-w-wide">
          <Heading as="h1" size="display">
            {page.title}
          </Heading>
          <p className="mt-4 font-display text-sm text-muted display-ui">
            {legal.updatedLabel}: {legal.updated}
          </p>
          <p className="mt-6 rounded-card border-2 border-dashed border-accent bg-surface p-4 font-display text-sm text-accent display-ui">
            {legal.draftNotice}
          </p>
          <p className="mt-8 max-w-measure text-lg">{page.intro}</p>

          {page.sections.map((s) => (
            <section key={s.heading} className="mt-10 border-t-2 border-ink pt-6">
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
