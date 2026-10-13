import Link from "next/link";
import { categoryLabel, formatDate, type BlogCard } from "@/lib/blog";

/** One post in a grid. The whole card links to the post (title link stretched over it). */
export function PostCard({ post, headingLevel = "h2" }: { post: BlogCard; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <article className="rz-card group relative flex h-full flex-col overflow-hidden rounded-card border-2 border-ink bg-surface">
      <div className="aspect-16/10 overflow-hidden border-b-2 border-ink bg-canvas">
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote cover image from the post row
          <img src={post.featured_image_url} alt={post.featured_image_alt ?? ""} width={800} height={500} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="grid-backdrop flex h-full items-end bg-band p-4">
            <span className="font-display text-2xl font-heavy text-on-band display-tight">{categoryLabel(post.category)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="font-display text-sm font-bold text-accent display-ui">{categoryLabel(post.category)}</p>
        <H className="mt-2 font-display text-xl font-heavy text-balance display-tight">
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
            {post.title}
          </Link>
        </H>
        {post.excerpt && <p className="mt-3 line-clamp-3 text-base text-muted">{post.excerpt}</p>}
        <p className="mt-auto pt-4 font-display text-sm text-muted display-ui">
          {post.published_at && <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>}
          {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min read` : ""}
        </p>
      </div>
    </article>
  );
}
