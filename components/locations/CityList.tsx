"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { TileArrow, tileClass } from "@/components/locations/tiles";

type Props = { links: { href: string; text: string }[]; label: string; perPage?: number };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ‘’'.]/g, "")
    .toLowerCase()
    .trim();

/**
 * The city list on state pages: a search box, then the cities as tiles, 60 a page.
 * Every link is in the HTML (others use the `hidden` attribute), so search engines
 * still see the whole list.
 */
export function CityList({ links, label, perPage = 60 }: Props) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const q = norm(query);
  const matches = links.map((l) => !q || norm(l.text).includes(q));
  const order = links.map((_, i) => i).filter((i) => matches[i]);
  const position = new Map(order.map((i, n) => [i, n]));
  const pages = Math.max(1, Math.ceil(order.length / perPage));
  const current = Math.min(page, pages - 1);
  const from = current * perPage;
  const to = Math.min(order.length, from + perPage);

  function go(next: number) {
    const p = Math.min(pages - 1, Math.max(0, next));
    if (p === current) return;
    setPage(p);
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div ref={top} className="scroll-mt-24 overflow-hidden rounded-card border-2 border-ink bg-canvas shadow-hard">
      <div className="flex flex-col gap-3 border-b-2 border-ink bg-surface p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex w-full flex-col gap-2 md:max-w-wide md:flex-row md:items-center md:gap-4">
          <label htmlFor={inputId} className="font-display text-sm font-bold display-ui">
            Find your city
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={`Search ${fmt(links.length)} cities`}
            autoComplete="off"
            className="min-h-12 w-full rounded-ui border-2 border-ink bg-canvas px-4 text-base md:max-w-[22rem]"
          />
        </div>
        <p className="shrink-0 font-display text-sm display-ui" aria-live="polite">
          {order.length === 0 ? "No matches" : `${fmt(from + 1)}–${fmt(to)} of ${fmt(order.length)}`}
        </p>
      </div>

      <div className="p-4 md:p-6">
        {/* Re-keyed per page and search so each view plays the settle-in animation. */}
        <ul key={`${current}-${q}`} aria-label={label} className="rz-page-in grid grid-cols-2 gap-2 lg:grid-cols-4">
          {links.map((l, i) => {
            const n = position.get(i);
            const visible = n !== undefined && n >= from && n < to;
            return (
              <li key={l.href} hidden={!visible}>
                <Link href={l.href} prefetch={false} className={tileClass}>
                  <span className="min-w-0">{l.text}</span>
                  <TileArrow />
                </Link>
              </li>
            );
          })}
        </ul>
        {order.length === 0 && (
          <p className="text-base">
            No city matches “{query}”. We build sites everywhere, so request a free demo and we will design one around your service area.
          </p>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label={`${label} pages`} className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-surface p-4 md:px-6">
          <PageButton onClick={() => go(current - 1)} disabled={current === 0}>
            ← Previous
          </PageButton>
          <ul className="flex flex-wrap justify-center gap-1">
            {pageNumbers(current, pages).map((p, i) =>
              p === null ? (
                <li key={`gap-${i}`} aria-hidden="true" className="inline-flex min-h-11 items-center px-1 font-display">
                  …
                </li>
              ) : (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => go(p)}
                    aria-label={`Page ${p + 1}`}
                    aria-current={p === current ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 border-ink font-display text-sm font-bold display-ui transition-button duration-fast ${
                      p === current ? "bg-ink text-on-ink" : "bg-canvas hover:bg-ink hover:text-on-ink"
                    }`}
                  >
                    {p + 1}
                  </button>
                </li>
              ),
            )}
          </ul>
          <PageButton onClick={() => go(current + 1)} disabled={current === pages - 1}>
            Next →
          </PageButton>
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
      className="inline-flex min-h-11 items-center rounded-ui border-2 border-ink bg-canvas px-4 font-display text-sm font-bold display-ui transition-button duration-fast enabled:hover:bg-ink enabled:hover:text-on-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** First, last, and one either side of the current page; null marks a gap. */
function pageNumbers(current: number, total: number): (number | null)[] {
  const keep = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}
