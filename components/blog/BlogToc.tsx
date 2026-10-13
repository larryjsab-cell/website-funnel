"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/blog";

/**
 * "On this page": a collapsible list on phones, a sticky sidebar on desktop, and on
 * both the section you're reading is highlighted. Links are plain anchors, so it works
 * without JavaScript too.
 */
export function BlogToc({ toc, variant }: { toc: TocItem[]; variant: "inline" | "sidebar" }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setCurrent(top.target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [toc]);

  if (!toc.length) return null;
  const list = (
    <ol className="grid gap-1">
      {toc.map((t) => (
        <li key={t.id} className={t.level > 2 ? "pl-4" : ""}>
          <a
            href={`#${t.id}`}
            aria-current={current === t.id ? "location" : undefined}
            className={`flex min-h-11 items-center border-l-4 py-1 pl-3 text-base underline-offset-4 hover:underline ${current === t.id ? "border-accent font-semibold text-ink" : "border-transparent text-muted"}`}
          >
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === "inline") {
    return (
      <details className="mb-10 rounded-card border-2 border-ink bg-surface lg:hidden">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-display font-bold display-ui">
          On this page <span aria-hidden="true">+</span>
        </summary>
        <nav aria-label="On this page" className="border-t-2 border-ink p-3">
          {list}
        </nav>
      </details>
    );
  }
  return (
    <nav aria-label="Table of contents" className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block">
      <p className="font-display text-sm font-bold display-ui">On this page</p>
      <div className="mt-3">{list}</div>
    </nav>
  );
}
