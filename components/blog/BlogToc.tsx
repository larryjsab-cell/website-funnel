"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/blog";

/**
 * "On this page": a collapsible list on phones, a sticky sidebar on desktop, and on
 * both the section you're reading is highlighted. Links are plain anchors, so it works
 * without JavaScript too.
 */
export function BlogToc({ toc, variant }: { toc: TocItem[]; variant: "inline" | "sidebar" }) {
  const [current, setCurrent] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

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

  // Long guides can outgrow the sidebar: keep the section being read in view inside it,
  // without scrolling the page itself.
  useEffect(() => {
    const nav = navRef.current;
    const link = current ? nav?.querySelector<HTMLElement>(`a[href="#${CSS.escape(current)}"]`) : null;
    if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return;
    const top = link.offsetTop - nav.offsetTop;
    if (top < nav.scrollTop || top + link.offsetHeight > nav.scrollTop + nav.clientHeight) {
      nav.scrollTo({ top: Math.max(0, top - nav.clientHeight / 3), behavior: "smooth" });
    }
  }, [current]);

  if (!toc.length) return null;
  // Phones get full-size tap targets; the desktop sidebar is compact so long guides fit.
  const row = variant === "sidebar" ? "py-1.5 text-sm leading-snug" : "min-h-11 py-1 text-base";
  const list = (
    <ol className={variant === "sidebar" ? "grid gap-2" : "grid gap-1"}>
      {toc.map((t) => (
        <li key={t.id} className={t.level > 2 ? "pl-4" : ""}>
          <a
            href={`#${t.id}`}
            aria-current={current === t.id ? "location" : undefined}
            className={`flex items-center border-l-4 pl-3 underline-offset-4 hover:underline ${row} ${current === t.id ? "border-accent font-semibold text-ink" : "border-transparent text-muted"}`}
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
    <nav
      ref={navRef}
      aria-label="Table of contents"
      className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto [scrollbar-width:none] lg:block [&::-webkit-scrollbar]:hidden"
    >
      <p className="font-display text-sm font-bold display-ui">On this page</p>
      <div className="mt-3">{list}</div>
    </nav>
  );
}
