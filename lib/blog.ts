/**
 * Blog data from Supabase (public.ryzon_landing_blog), read on the server with the public
 * key: row-level security only returns published posts. Pages are statically generated
 * and refreshed every 30 minutes (ISR), so crawlers always get full HTML.
 */
import { PUBLIC_API as API, publicHeaders } from "@/lib/publicApi";
import { site, siteUrl } from "@/lib/site";

export const BLOG_REVALIDATE = 1800;

export type TocItem = { id: string; text: string; level: number; content_description?: string };
export type InternalLink = { href: string; text: string; rel?: string };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  reading_time_minutes: number | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  secondary_keywords: string[] | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  category: string;
  tags: string[] | null;
  author_name: string;
  author_slug: string | null;
  author_avatar_url: string | null;
  author_bio: string | null;
  schema_markup: Record<string, unknown> | null;
  table_of_contents: TocItem[] | null;
  internal_links: InternalLink[] | null;
  cta_text: string | null;
  cta_href: string | null;
  published_at: string | null;
  updated_at: string;
};

export type BlogCard = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "category" | "tags" | "featured_image_url" | "featured_image_alt" | "author_name" | "reading_time_minutes" | "published_at" | "updated_at"
>;

const CARD_FIELDS = "id,slug,title,excerpt,category,tags,featured_image_url,featured_image_alt,author_name,reading_time_minutes,published_at,updated_at";

async function query<T>(params: string): Promise<T[]> {
  try {
    const res = await fetch(`${API}/ryzon_landing_blog?${params}`, {
      headers: publicHeaders,
      next: { revalidate: BLOG_REVALIDATE, tags: ["blog"] },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T[];
  } catch (e) {
    // An unreachable database shows an empty blog rather than a broken page.
    console.warn(`[blog] query failed (${(e as Error).message}): ${params.slice(0, 80)}`);
    return [];
  }
}

export function getAllPublishedPosts() {
  return query<BlogCard>(`select=${CARD_FIELDS}&is_published=eq.true&order=published_at.desc.nullslast`);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  const rows = await query<BlogPost>(`select=*&is_published=eq.true&slug=eq.${slug}&limit=1`);
  return rows[0] ? withToc(rows[0]) : null;
}

/** Same category first, then the newest of the rest. */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogCard[]> {
  const all = await getAllPublishedPosts();
  const others = all.filter((p) => p.slug !== post.slug);
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, limit);
}

// ---------------------------------------------------------------- content helpers

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();

/**
 * Every h2/h3 gets an id (so the table of contents can link to it), and the table of
 * contents is built from the headings when the row doesn't carry one.
 */
function withToc(post: BlogPost): BlogPost {
  const seen = new Set<string>();
  const found: TocItem[] = [];
  const content = post.content.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_m, level: string, attrs: string, inner: string) => {
    const existing = /\sid=["']([^"']+)["']/i.exec(attrs)?.[1];
    let id = existing || slugify(inner) || `section-${found.length + 1}`;
    while (!existing && seen.has(id)) id = `${id}-2`;
    seen.add(id);
    found.push({ id, text: stripTags(inner), level: Number(level) });
    return `<h${level}${existing ? attrs : `${attrs} id="${id}"`}>${inner}</h${level}>`;
  });
  // Long posts list main sections only, so the sidebar stays scannable.
  const outline = found.length > 14 ? found.filter((t) => t.level === 2) : found;
  const toc = post.table_of_contents?.length ? post.table_of_contents : outline;
  const words = stripTags(content).split(/\s+/).filter(Boolean).length;
  return { ...post, content, table_of_contents: toc, reading_time_minutes: post.reading_time_minutes ?? Math.max(1, Math.round(words / 230)) };
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

export function categoryLabel(category: string) {
  const c = category.replace(/-/g, " ");
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export const postUrl = (post: Pick<BlogPost, "slug" | "canonical_url">) => post.canonical_url || `${siteUrl}/blog/${post.slug}`;

export function buildArticleSchema(post: BlogPost) {
  const image = post.og_image || post.featured_image_url || `${siteUrl}/opengraph-image`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl(post)}#article`,
    mainEntityOfPage: postUrl(post),
    headline: post.title,
    description: post.meta_description || post.excerpt || undefined,
    image,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at,
    articleSection: categoryLabel(post.category),
    keywords: [post.focus_keyword, ...(post.secondary_keywords ?? []), ...(post.tags ?? [])].filter(Boolean).join(", ") || undefined,
    wordCount: stripTags(post.content).split(/\s+/).filter(Boolean).length,
    inLanguage: "en-US",
    // A named person when there is one; the company team otherwise.
    author: {
      "@type": post.author_slug && !/\bteam\b/i.test(post.author_name) ? "Person" : "Organization",
      name: post.author_name,
      url: siteUrl,
      image: post.author_avatar_url || undefined,
    },
    publisher: { "@type": "Organization", "@id": `${siteUrl}/#business`, name: site.business.name, url: `${siteUrl}/` },
  };
}

/**
 * FAQPage data from the post's FAQ section: an h2 with id="faq", then each h3 is a
 * question and the text up to the next h3 is its answer. Null when there is none.
 */
export function buildFaqSchema(post: Pick<BlogPost, "content" | "slug" | "canonical_url">) {
  const start = post.content.search(/<h2[^>]*\sid=["']faq["'][^>]*>/i);
  if (start < 0) return null;
  const rest = post.content.slice(start).replace(/^<h2[\s\S]*?<\/h2>/i, "");
  const section = rest.split(/<h2[\s>]/i)[0];
  const questions = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[\s>]|$)/gi)]
    .map(([, q, a]) => ({ q: stripTags(q), a: stripTags(a.replace(/<\/(p|li)>/gi, " ")).replace(/\s+/g, " ") }))
    .filter((x) => x.q && x.a);
  if (!questions.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${postUrl(post)}#faq`,
    mainEntity: questions.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}

export function buildBreadcrumbSchema(post: Pick<BlogPost, "slug" | "title">) {
  const items = [
    { name: "Home", item: `${siteUrl}/` },
    { name: "Blog", item: `${siteUrl}/blog` },
    { name: post.title, item: `${siteUrl}/blog/${post.slug}` },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })),
  };
}
