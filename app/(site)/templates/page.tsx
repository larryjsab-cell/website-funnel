import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { primaryButton, secondaryButton } from "@/components/flow/Message";
import { site, siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";

const title = `Free n8n Workflow Templates | ${site.business.name}`;
const description =
  "Free n8n automation templates you can import in one click. Start with the SEO Website Auditor: enter a website, get an in-depth audit as a PDF.";

export const metadata = pageMeta({ title, description, path: "/templates", image: { alt: `Free n8n templates from ${site.business.name}` } });

type Template = {
  slug: string;
  name: string;
  summary: string;
  file: string;
  size: string;
  checks: string[];
  needs: [string, string][];
  steps: string[];
};

const TEMPLATES: Template[] = [
  {
    slug: "seo-website-auditor",
    name: "SEO Website Auditor (website audit to PDF)",
    summary:
      "Type in any website. About 2 to 3 minutes later you get an in-depth SEO audit as a PDF, saved to Google Drive and ready to download, with a checklist of what to fix first.",
    file: "/templates/seo-website-auditor.json",
    size: "116 KB",
    checks: [
      "Homepage and up to 5 key pages: titles, descriptions, headings, content, links, images and 40+ technical checks",
      "Mobile and desktop speed scores with Core Web Vitals and the biggest speed fixes",
      "Keywords the site ranks for, page-one count, traffic and keywords close to page one",
      "Top competitors and the live Google results and map pack for the main keyword",
      "Google Business Profile: rating, reviews, photos, categories and whether it’s claimed",
      "Backlinks (optional)",
      "An AI-written summary, top 7 fixes, content ideas, a local plan and a 30/60/90 day plan, based only on the data",
    ],
    needs: [
      ["n8n", "Cloud or self-hosted"],
      ["DataForSEO account", "Pay as you go, usually a few cents per audit"],
      ["kie.ai API key", "Writes the summary and plan"],
      ["Google Drive (optional)", "Turns the report into a PDF. Without it you still get the report as a download"],
      ["Google PageSpeed API key (optional)", "Free, avoids speed-test limits"],
    ],
    steps: [
      "Download the file below. In n8n, create a new workflow, open the menu and choose Import from File.",
      "Add a DataForSEO credential (Basic Auth: your API login and API password) and select it on every DataForSEO box.",
      "Add a kie.ai credential (Header Auth: name Authorization, value Bearer YOUR_KEY) and select it on both kie GPT boxes.",
      "Optional: connect Google Drive and select it on the 5 Drive boxes. You can paste a folder ID in the Read URL box.",
      "Publish the workflow, open the Audit Form box and copy the Production URL. That’s your audit form.",
    ],
  },
];

export default function TemplatesPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${siteUrl}/templates#page`,
              url: `${siteUrl}/templates`,
              name: "Free n8n workflow templates",
              description,
              publisher: { "@id": `${siteUrl}/#business` },
              hasPart: TEMPLATES.map((t) => ({
                "@type": "SoftwareSourceCode",
                name: t.name,
                description: t.summary,
                url: `${siteUrl}/templates#${t.slug}`,
                downloadUrl: `${siteUrl}${t.file}`,
                programmingLanguage: "n8n workflow JSON",
                isAccessibleForFree: true,
              })),
            },
            breadcrumbs([{ name: "Free Templates", path: "/templates" }]),
          ],
        }}
      />

      <section aria-labelledby="templates-heading" className="rz-hero border-b-2 border-ink bg-band py-16 text-on-band md:py-24">
        <Container>
          <nav aria-label="Breadcrumb" className="font-display text-sm display-ui">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Free Templates</li>
            </ol>
          </nav>
          <h1 id="templates-heading" className="mt-4 max-w-wide font-display text-3xl font-heavy text-balance display-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Free n8n templates. Import, connect, run.
          </h1>
          <p className="mt-6 max-w-measure text-lg">
            The automations we use for our own clients, free to download. Each one comes with setup steps written in plain English. No email required.
          </p>
        </Container>
      </section>

      <section aria-label="Templates" className="py-16 md:py-24">
        <Container>
          <ul className="grid gap-10">
            {TEMPLATES.map((t) => (
              <li key={t.slug} id={t.slug} className="scroll-mt-24 rounded-card border-2 border-ink bg-surface p-6 shadow-hard md:p-10">
                <p className="font-display text-sm font-bold uppercase display-ui">Template 1 · n8n</p>
                <h2 className="mt-2 font-display text-2xl font-heavy text-balance display-tight md:text-3xl">{t.name}</h2>
                <p className="mt-4 max-w-measure text-lg">{t.summary}</p>
                <div className="mt-6 flex flex-wrap gap-4">
                  <a href={t.file} download className={primaryButton}>
                    Download the Template (JSON, {t.size})
                  </a>
                  <a href="#footer-contact" className={secondaryButton}>
                    Want It Set Up for You?
                  </a>
                </div>

                <div className="mt-10 grid gap-10 lg:grid-cols-2">
                  <div>
                    <h3 className="font-display text-lg font-heavy display-tight">What the report covers</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                      {t.checks.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-heavy display-tight">What you need</h3>
                    <dl className="mt-3 space-y-3">
                      {t.needs.map(([k, v]) => (
                        <div key={k}>
                          <dt className="font-bold">{k}</dt>
                          <dd className="text-muted">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                <h3 className="mt-10 font-display text-lg font-heavy display-tight">Set it up in about 5 minutes</h3>
                <ol className="mt-3 max-w-measure list-decimal space-y-2 pl-5">
                  {t.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <p className="mt-6 max-w-measure text-sm text-muted">
                  The form only asks for the website. The business name, city and main keyword are detected from the site. PDFs are saved as
                  &ldquo;Business Name SEO Audit YYYY-MM-DD.pdf&rdquo;.
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 max-w-measure">More templates are on the way. Check back soon.</p>
        </Container>
      </section>
    </>
  );
}
