"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Img = { src: string; width: number; height: number };

type Props = {
  id: string;
  title: string;
  alt: string;
  industry: string;
  ctaLabel: string;
  ctaHref: string;
  card: Img;
  full: Img;
  className?: string;
};

/**
 * A sample design as a screenshot. The card shows the top of the page (nav first) and
 * loads lazily; tapping it opens the whole page full screen to scroll like the real
 * site. The full-size image is only requested once the popup opens.
 */
export function ExampleShot({ id, title, alt, industry, ctaLabel, ctaHref, card, full, className = "" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // Arrow keys and the space bar scroll the page straight away.
    scrollRef.current?.focus();
    document.documentElement.classList.add("overflow-hidden");
    return () => document.documentElement.classList.remove("overflow-hidden");
  }, [open]);

  const close = () => dialogRef.current?.close();
  const titleId = `shot-${id}-title`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`View the ${title.toLowerCase()} sample design full screen. ${alt}`}
        className={`group relative z-10 block cursor-zoom-in overflow-hidden bg-canvas ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pre-cropped static file, sized by scripts/example-shots.mjs */}
        <img
          src={card.src}
          width={card.width}
          height={card.height}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-4/3 h-auto w-full object-cover object-top"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-ui border-2 border-ink bg-surface px-2 py-1 font-display text-sm font-bold text-ink display-ui"
        >
          <span className="hidden md:inline">View Full Design</span>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-canvas p-0 text-ink"
      >
        {open && (
          <div className="flex h-full flex-col">
            <div className="flex flex-none items-center justify-between gap-3 border-b-2 border-ink bg-canvas px-4 py-2">
              <p id={titleId} className="min-w-0 truncate font-display text-sm font-bold display-ui">
                {title} <span className="hidden font-normal text-muted sm:inline">· sample design</span>
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={ctaHref}
                  prefetch={false}
                  data-cta={`example_shot_${id}`}
                  data-industry={industry}
                  onClick={close}
                  className="rz-btn rz-btn-primary hidden min-h-11 items-center rounded-ui border-2 border-ink bg-cta px-4 font-display text-sm font-bold text-on-cta display-ui sm:inline-flex"
                >
                  {ctaLabel}
                </Link>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close the sample design"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 border-ink bg-surface px-3 font-display text-sm font-bold display-ui hover:bg-ink hover:text-on-ink active:bg-ink active:text-on-ink"
                >
                  Close
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              tabIndex={0}
              role="region"
              aria-label={`${title} sample design, scrollable`}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-band"
            >
              {/* The page starts at its nav, at phone width; wider screens center it. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot, loaded only when the popup opens */}
              <img src={full.src} width={full.width} height={full.height} alt={alt} decoding="async" className="mx-auto block h-auto w-full max-w-[430px] bg-surface" />
            </div>

            <div className="flex-none border-t-2 border-ink bg-canvas px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 sm:hidden">
              <Link
                href={ctaHref}
                prefetch={false}
                data-cta={`example_shot_${id}_bar`}
                data-industry={industry}
                onClick={close}
                className="rz-btn rz-btn-primary flex min-h-12 w-full items-center justify-center rounded-ui border-2 border-ink bg-cta px-4 font-display text-sm font-bold text-on-cta display-ui"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
