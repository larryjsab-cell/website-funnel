"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type CityLinkItem = { href: string; text: string; letter: string };
type Props = { groups: { letter: string; links: { href: string; text: string }[] }[]; label: string; perPage?: number };

/**
 * The A-Z city list on state pages, 60 at a time with page buttons, so the list never
 * grows down the screen. Every link is in the HTML (other pages use the `hidden`
 * attribute), so search engines still see them all.
 */
export function CityList({ groups, label, perPage = 60 }: Props) {
  const items: CityLinkItem[] = groups.flatMap((g) => g.links.map((l) => ({ ...l, letter: g.letter })));
  // Position of each group's first link in the whole list.
  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.links.length, 0));
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  // The page each letter starts on, for the A-Z bar.
  const letterPage = new Map<string, number>();
  items.forEach((c, i) => {
    if (!letterPage.has(c.letter)) letterPage.set(c.letter, Math.floor(i / perPage));
  });

  function go(next: number) {
    const p = Math.min(pages - 1, Math.max(0, next));
    if (p === page) return;
    setPage(p);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const from = page * perPage;
  const to = Math.min(items.length, from + perPage);

  return (
    <div ref={top} className="scroll-mt-24">
      {pages > 1 && (
        <nav aria-label={`${label} by letter`} className="mb-6">
          <ul className="flex flex-wrap gap-1">
            {[...letterPage.entries()].map(([letter, p]) => (
              <li key={letter}>
                <button
                  type="button"
                  onClick={() => go(p)}
                  aria-current={p === page ? "true" : undefined}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 font-display text-sm font-bold display-ui transition-button duration-fast ${
                    p === page ? "border-ink bg-ink text-on-ink" : "border-transparent hover:border-ink"
                  }`}
                >
                  {letter}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Re-keyed per page so each page plays the settle-in animation. */}
      <div key={page} className="rz-page-in grid gap-8">
        {groups.map((g, gi) => {
          const start = starts[gi];
          const onPage = (i: number) => start + i >= from && start + i < to;
          return (
            <div key={g.letter} hidden={!g.links.some((_, i) => onPage(i))}>
              <h3 className="font-display text-xl font-heavy display-tight">{g.letter}</h3>
              <ul aria-label={`${label} starting with ${g.letter}`} className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                {g.links.map((l, i) => (
                  <li key={l.href} hidden={!onPage(i)}>
                    <Link href={l.href} prefetch={false} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-accent">
                      {l.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

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
            Showing {(from + 1).toLocaleString("en-US")}–{to.toLocaleString("en-US")} of {items.length.toLocaleString("en-US")} cities
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
