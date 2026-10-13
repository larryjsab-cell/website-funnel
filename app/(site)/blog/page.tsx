import Link from "next/link";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { getAllPublishedPosts } from "@/lib/blog";
import { site, siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/schema";
import { pageMeta } from "@/lib/seo";

export const revalidate = 1800; // seconds; matches BLOG_REVALIDATE (segment config must be a literal)

const title = `Small Business Website Tips & Guides | ${site.business.name}`;
const description = "Plain-English guides on websites for local businesses: costs, what to include, getting found on Google and turning visitors into calls.";

export const metadata = pageMeta({ title, description, path: "/blog", image: { alt: `${site.business.name} blog` } });

export default async function BlogPage() {
  const posts = await getAllPublishedPosts();
  const categories = Array.from(new Set(posts.map((p) => p.category))).sort();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Blog",
              "@id": `${siteUrl}/blog#blog`,
              url: `${siteUrl}/blog`,
              name: `${site.business.name} blog`,
              description,
              publisher: { "@id": `${siteUrl}/#business` },
              blogPost: posts.map((p) => ({
                "@type": "BlogPosting",
                headline: p.title,
                url: `${siteUrl}/blog/${p.slug}`,
                datePublished: p.published_at ?? undefined,
              })),
            },
            breadcrumbs([{ name: "Blog", path: "/blog" }]),
          ],
        }}
      />

      <section aria-labelledby="blog-heading" className="rz-hero border-b-2 border-ink bg-band py-16 text-on-band md:py-24">
        <Container>
          <nav aria-label="Breadcrumb" className="font-display text-sm display-ui">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Blog</li>
            </ol>
          </nav>
          <h1 id="blog-heading" className="mt-4 max-w-wide font-display text-3xl font-heavy text-balance display-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Websites that win local customers, explained.
          </h1>
          <p className="mt-6 max-w-measure text-lg">
            Straight answers for small business owners: what a website should cost, what to put on it, and how to get found by people nearby. No jargon.
          </p>
          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-muted pt-6 font-display text-sm display-ui">
            <span>
              <strong className="tabular-nums">{posts.length}</strong> {posts.length === 1 ? "article" : "articles"}
            </span>
            <span>
              <strong className="tabular-nums">{categories.length}</strong> {categories.length === 1 ? "topic" : "topics"}
            </span>
            <span>Written by the {site.business.shortName} team</span>
          </p>
        </Container>
      </section>

      <section aria-label="Articles" className="py-16 md:py-24">
        <Container>
          {posts.length === 0 ? (
            <div className="rounded-card border-2 border-dashed border-ink p-10 text-center">
              <p className="font-display text-xl font-heavy display-tight">No articles yet.</p>
              <p className="mt-2 text-muted">The first guides are on the way.</p>
            </div>
          ) : (
            <BlogIndex posts={posts} categories={categories} />
          )}
        </Container>
      </section>
    </>
  );
}
