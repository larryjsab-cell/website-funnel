import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * Full metadata for an indexable page: canonical, Open Graph and Twitter card.
 * Next.js replaces (not merges) a parent's openGraph/twitter, so every field is set here.
 * `title` is the complete <title> (no template applied).
 */
export function pageMeta({ title, description, path, image }: { title: string; description: string; path: string; image?: { alt: string } }): Metadata {
  // Pages with their own opengraph-image.tsx / twitter-image.tsx get images from those files.
  // The home page shares the root ones, which its own openGraph would otherwise drop.
  // An `images` key, even undefined, would hide the file-based images, so it's only added when set.
  const ogImages = image ? { images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: image.alt }] } : {};
  const twitterImages = image ? { images: [{ url: "/twitter-image", alt: image.alt }] } : {};
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.business.name, locale: site.site.locale, url: path, title, description, ...ogImages },
    twitter: { card: "summary_large_image", title, description, ...twitterImages },
  };
}
