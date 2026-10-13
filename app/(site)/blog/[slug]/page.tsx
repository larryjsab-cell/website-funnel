import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogToc } from "@/components/blog/BlogToc";
import { AuthorBox, InternalLinks, PostBody, PostCta, RelatedPosts } from "@/components/blog/PostParts";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  categoryLabel,
  formatDate,
  getAllPublishedPosts,
  getPostBySlug,
  getRelatedPosts,
  postUrl,
} from "@/lib/blog";
import { site } from "@/lib/site";

export const revalidate = 1800; // seconds; matches BLOG_REVALIDATE (segment config must be a literal)
// New posts published after the build render on first request, then stay cached.
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAllPublishedPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const title = `${post.meta_title || post.title} | ${site.business.name}`;
  const description = post.meta_description || post.excerpt || "";
  const image = post.og_image || post.featured_image_url;
  const url = postUrl(post);
  return {
    title: { absolute: title },
    description,
    keywords: [post.focus_keyword, ...(post.secondary_keywords ?? [])].filter((k): k is string => !!k),
    alternates: { canonical: url },
    authors: [{ name: post.author_name }],
    openGraph: {
      type: "article",
      siteName: site.business.name,
      locale: site.site.locale,
      url,
      title: post.og_title || post.meta_title || post.title,
      description: post.og_description || description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      section: categoryLabel(post.category),
      tags: post.tags ?? undefined,
      images: [image ? { url: image, alt: post.featured_image_alt || post.title } : { url: "/opengraph-image", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.og_title || post.meta_title || post.title,
      description: post.og_description || description,
      images: [image || "/twitter-image"],
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const related = await getRelatedPosts(post);
  const toc = post.table_of_contents ?? [];

  return (
    <>
      <JsonLd data={post.schema_markup ?? buildArticleSchema(post)} />
      <JsonLd data={buildBreadcrumbSchema(post)} />

      <article>
        <header className="border-b-2 border-ink bg-band text-on-band">
          <Container className="grid gap-8 py-12 md:py-16 lg:grid-cols-12 lg:items-center">
            <div className={post.featured_image_url ? "lg:col-span-7" : "lg:col-span-10"}>
              <nav aria-label="Breadcrumb" className="font-display text-sm display-ui">
                <ol className="flex flex-wrap items-center gap-x-2">
                  <li>
                    <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href="/blog" className="inline-flex min-h-11 items-center underline underline-offset-4">
                      Blog
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="line-clamp-1 min-w-0">
                    {post.title}
                  </li>
                </ol>
              </nav>
              <p className="mt-4 inline-block rounded-ui bg-cta px-3 py-1 font-display text-sm font-bold text-on-cta display-ui">{categoryLabel(post.category)}</p>
              <h1 className="mt-4 font-display text-3xl font-heavy text-balance display-tight sm:text-4xl md:text-5xl">{post.title}</h1>
              <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-sm display-ui">
                <span>By {post.author_name}</span>
                {post.published_at && (
                  <span>
                    <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                  </span>
                )}
                {post.reading_time_minutes && <span>{post.reading_time_minutes} min read</span>}
              </p>
            </div>
            {post.featured_image_url && (
              <div className="lg:col-span-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote cover image; the post's LCP element */}
                <img
                  src={post.featured_image_url}
                  alt={post.featured_image_alt || ""}
                  width={1200}
                  height={750}
                  fetchPriority="high"
                  className="aspect-16/10 w-full rounded-card border-2 border-on-band object-cover"
                />
              </div>
            )}
          </Container>
        </header>

        <Container className="grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">
            {post.excerpt && <p className="mb-10 max-w-measure border-l-4 border-accent pl-5 text-lg font-medium md:text-xl">{post.excerpt}</p>}
            <BlogToc toc={toc} variant="inline" />
            <PostBody html={post.content} />
            {post.tags && post.tags.length > 0 && (
              <ul aria-label="Tags" className="mt-12 flex flex-wrap gap-2 border-t-2 border-ink pt-6">
                {post.tags.map((t) => (
                  <li key={t} className="rounded-ui border-2 border-ink px-3 py-1 font-display text-sm display-ui">
                    #{t}
                  </li>
                ))}
              </ul>
            )}
            <InternalLinks links={post.internal_links} />
            <AuthorBox post={post} />
          </div>
          <div>
            <BlogToc toc={toc} variant="sidebar" />
          </div>
        </Container>
      </article>

      <RelatedPosts posts={related} />
      <PostCta text={post.cta_text} href={post.cta_href} />
    </>
  );
}
