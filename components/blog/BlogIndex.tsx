"use client";

import { useState } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { categoryLabel, type BlogCard } from "@/lib/blog";

/**
 * Category filter over the post grid. Every post is in the server HTML (crawlers and
 * no-JS visitors see them all); the buttons only hide cards in the browser.
 */
export function BlogIndex({ posts, categories }: { posts: BlogCard[]; categories: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = active ? posts.filter((p) => p.category === active) : posts;
  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-ui border-2 border-ink px-4 font-display text-sm font-bold display-ui ${on ? "bg-ink text-on-ink" : "bg-surface hover:bg-ink hover:text-on-ink"}`;

  return (
    <>
      {categories.length > 1 && (
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={active === null} onClick={() => setActive(null)} className={chip(active === null)}>
            All <span className="ml-2 font-normal tabular-nums">{posts.length}</span>
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={active === c} onClick={() => setActive(c)} className={chip(active === c)}>
              {categoryLabel(c)} <span className="ml-2 font-normal tabular-nums">{posts.filter((p) => p.category === c).length}</span>
            </button>
          ))}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {active ? `Showing ${shown.length} ${categoryLabel(active)} ${shown.length === 1 ? "post" : "posts"}` : `Showing all ${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
      </p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <li key={p.id}>
            <PostCard post={p} />
          </li>
        ))}
      </ul>
    </>
  );
}
