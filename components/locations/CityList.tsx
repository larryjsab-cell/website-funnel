"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Props = { links: { href: string; text: string }[]; label: string; perPage?: number };

/**
 * The city list on state pages: one alphabetical list, 60 at a time with page buttons,
 * so it never grows down the screen. Every link is in the HTML (other pages use the
 * `hidden` attribute), so search engines still see them all.
 */
export function CityList({ links, label, perPage = 60 }: Props) {
  const pages = Math.max(1, Math.ceil(links.length / perPage));
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  // The page each first letter starts on, for the A-Z jump bar.
  const letterPage = new Map<string, number>();
  links.forEach((l, i) => {
    const letter = l.text.charAt(0).toUpperCase();
    if (!letterPage.has(letter)) letterPage.set(letter, Math.floor(i / perPage));
  });

  function go(next: number) {
    const p = Math.min(pages - 1, Math.max(0, next));
    if (p === page) return;
    setPage(p);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const from = page * perPage;
  const to = Math.min(links.length, from + perPage);

  return (
    <div ref={top} className="scroll-mt-24">
      {pages > 1 && (
        <nav aria-label={`Jump to ${label.toLowerCase()} by first letter`} className="mb-6">
          <ul className="flex flex-wrap gap-1">
            {[...letterPage.entries()].map(([letter, p]) => (
              <li key={letter}>
                <button
                  type="button"
                  onClick={() => go(p)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 border-transparent font-display text-sm font-bold display-ui transition-button duration-fast hover:border-ink"
                >
                  {letter}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Re-keyed per page so each page plays the settle-in animation. */}
      <ul key={page} aria-label={label} className="rz-page-in grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l, i) => (
          <li key={l.href} hidden={i < from || i >= to}>
            <Link href={l.href} prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent">
              {l.text}
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label={`${label} pages`} className="mt-8 flex flex-wrap items-center gap-3">
          <PageButton onClick={() => go(page - 1)} disabled={page === 0}>
            ← Previous
          </PageButton>
          <ul className="flex flex-wrap gap-1">
            {pageNumbers(page, pages).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} aria-hidden="true" className="inline-flex min-h-11 items-center px-1">
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => go(p)}
                    aria-label={`Page ${p + 1}`}
                    aria-current={p === page ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 border-ink font-display text-sm font-bold display-ui transition-button duration-fast ${
                      p === page ? "bg-ink text-on-ink" : "hover:bg-ink hover:text-on-ink"
                    }`}
                  >
                    {p + 1}
                  </button>
                </li>
              ),
            )}
          </ul>
          <PageButton onClick={() => go(page + 1)} disabled={page === pages - 1}>
            Next →
          </PageButton>
          <p className="w-full text-base" aria-live="polite">
            Showing {(from + 1).toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {links.length.toLocaleString("en-US")} cities
          </p>
        </nav>
      )}
    </div>
  );
}

function PageButton({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-11 items-center rounded-ui border-2 border-ink px-4 font-display text-sm font-bold display-ui transition-button duration-fast enabled:hover:bg-ink enabled:hover:text-on-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** First, last, and two either side of the current page; null marks a gap. */
function pageNumbers(current: number, total: number): (number | null)[] {
  const keep = new Set([0, total - 1, current - 2, current - 1, current, current + 1, current + 2].filter((p) => p >= 0 && p < total));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}
