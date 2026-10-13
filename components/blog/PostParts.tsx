import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { CtaButton } from "@/components/ui/CtaButton";
import { Container } from "@/components/ui/Container";
import { site } from "@/lib/site";
import type { BlogCard, BlogPost } from "@/lib/blog";

/** Post HTML from the database. Only admins can write rows (RLS), so it's trusted markup. */
export function PostBody({ html }: { html: string }) {
  return <div className="rz-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AuthorBox({ post }: { post: BlogPost }) {
  return (
    <aside aria-label="About the author" className="mt-12 flex gap-4 rounded-card border-2 border-ink bg-surface p-5">
      {post.author_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
        <img src={post.author_avatar_url} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-full border-2 border-ink object-cover" />
      ) : (
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ui bg-ink font-display text-xl font-heavy text-on-ink">
          {post.author_name.charAt(0)}
        </span>
      )}
      <div className="min-w-0">
        <p className="font-display text-sm text-muted display-ui">Written by</p>
        <p className="font-display text-lg font-heavy display-tight">{post.author_name}</p>
        <p className="mt-2 text-base">
          {post.author_bio ||
            `${site.business.name} designs, hosts and manages websites for local small businesses, from ${site.offer.startingPrice} with a ${site.offer.designFee}.`}
        </p>
      </div>
    </aside>
  );
}

export function InternalLinks({ links }: { links: BlogPost["internal_links"] }) {
  if (!links?.length) return null;
  return (
    <nav aria-label="Related pages" className="mt-10">
      <p className="font-display text-sm font-bold display-ui">Keep reading</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              rel={l.rel || undefined}
              prefetch={l.href.startsWith("/#") ? false : undefined}
              className="flex min-h-12 items-center justify-between gap-3 rounded-ui border-2 border-ink bg-surface px-4 font-display text-sm font-bold display-ui hover:bg-ink hover:text-on-ink"
            >
              {l.text} <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function RelatedPosts({ posts }: { posts: BlogCard[] }) {
  if (!posts.length) return null;
  return (
    <section aria-labelledby="related-heading" className="border-t-2 border-ink py-16">
      <Container>
        <h2 id="related-heading" className="font-display text-2xl font-heavy display-tight sm:text-3xl">
          More from the blog
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} headingLevel="h3" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** Every post ends at the offer. */
export function PostCta({ text, href }: { text: string | null; href: string | null }) {
  return (
    <section aria-labelledby="post-cta-heading" className="border-t-2 border-ink bg-band py-16 text-on-band">
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-measure">
          <h2 id="post-cta-heading" className="font-display text-2xl font-heavy display-tight sm:text-3xl">
            See your new website before you pay a cent.
          </h2>
          <p className="mt-3 text-lg">
            {site.offer.line.join(" · ")}. {site.cta.microcopy}
          </p>
        </div>
        <CtaButton location="blog_post_cta" size="lg" onInk label={text || site.cta.primary.label} href={href || site.cta.primary.href} />
      </Container>
    </section>
  );
}
