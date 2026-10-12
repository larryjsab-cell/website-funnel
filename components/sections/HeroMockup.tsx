import type { CSSProperties, ReactNode } from "react";
import { Placeholder } from "@/components/ui/Placeholder";
import { landing } from "@/lib/content";

const m = landing.hero.mockup;

/** Stagger in ms for the build sequence. */
function Block({ d, children, className = "" }: { d: number; children: ReactNode; className?: string }) {
  return (
    <div className={`build-block ${className}`} style={{ "--d": d } as CSSProperties}>
      <div className="build-content">{children}</div>
    </div>
  );
}

/** Blueprint dimension line: |—— label ——| */
function Dimension({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-2 font-mono text-sm text-accent mono-semi ${className}`}>
      <span className="h-4 border-l-2 border-accent" />
      <span className="draw-x h-0 flex-1 border-t-2 border-accent" />
      <span className="shrink-0">{label}</span>
      <span className="draw-x h-0 flex-1 border-t-2 border-accent" />
      <span className="h-4 border-r-2 border-accent" />
    </div>
  );
}

/**
 * Signature element: a sample site that builds itself from wireframe to
 * finished design once on load. Purely illustrative, so the inner site is
 * hidden from assistive tech and described by the figcaption.
 */
export function HeroMockup() {
  return (
    <figure className="relative">
      <Dimension label={m.annotations.width} className="mb-3" />

      <div aria-hidden="true" className="relative">
        {/* Browser */}
        <div className="relative border-2 border-ink bg-surface shadow-hard-lg">
          <div className="flex h-10 items-center gap-2 border-b-2 border-ink px-3">
            <span className="h-3 w-3 border-2 border-ink" />
            <span className="h-3 w-3 border-2 border-ink" />
            <span className="h-3 w-3 bg-ink" />
            <span className="ml-2 min-w-0 flex-1 truncate border-2 border-ink px-2 font-mono text-sm leading-tight mono-semi">
              {m.url}
            </span>
          </div>

          <div className="relative overflow-hidden">
            <span className="build-scan pointer-events-none absolute inset-x-0 top-0 z-content h-0 border-t-2 border-accent" />

            <div className="grid gap-4 p-4 md:p-6">
              <Block d={0} className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="font-sans text-lg font-bold">{m.siteName}</span>
                  <span className="hidden gap-4 font-sans text-sm sm:flex">
                    {m.siteNav.map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </span>
                  <span className="flex flex-col gap-1 sm:hidden">
                    <span className="h-0.5 w-6 bg-ink" />
                    <span className="h-0.5 w-6 bg-ink" />
                    <span className="h-0.5 w-6 bg-ink" />
                  </span>
                </div>
              </Block>

              <div className="grid items-center gap-4 sm:grid-cols-2">
                <Block d={250}>
                  <p className="font-sans text-xl font-bold leading-tight md:text-2xl">{m.siteHeadline}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="inline-flex min-h-11 items-center bg-ink px-4 font-sans text-sm font-semibold text-on-ink">
                      {m.siteButton}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-sm text-accent mono-semi">
                      <span className="draw-x h-0 w-6 border-t-2 border-accent" />
                      {m.annotations.cta}
                    </span>
                  </div>
                </Block>
                <Block d={500}>
                  <Placeholder prompt={m.imagePrompt} alt="" aspect="16/10" decorative showLabel={false} priority="high" className="sm:aspect-4/3" />
                </Block>
              </div>

              <Block d={750} className="hidden sm:block">
                <div className="grid grid-cols-3 gap-3">
                  {m.siteNav.map((n) => (
                    <span key={n} className="border-2 border-ink p-3 font-sans text-sm font-semibold">
                      {n}
                    </span>
                  ))}
                </div>
              </Block>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="absolute -bottom-12 -right-4 hidden w-40 border-2 border-ink bg-surface shadow-hard xl:block">
          <div className="flex h-6 items-center justify-center border-b-2 border-ink">
            <span className="h-1 w-8 bg-ink" />
          </div>
          <div className="grid gap-2 p-3">
            <Block d={900}>
              <Placeholder prompt={m.imagePrompt} alt="" aspect="4/3" decorative showLabel={false} />
            </Block>
            <Block d={1050}>
              <p className="font-sans text-sm font-bold leading-tight">{m.siteHeadline}</p>
              <span className="mt-2 flex min-h-11 items-center justify-center bg-ink font-sans text-sm font-semibold text-on-ink">
                {m.siteButton}
              </span>
            </Block>
          </div>
        </div>
      </div>

      <figcaption className="mt-4 font-mono text-sm text-muted mono-semi xl:mt-16">{m.label}</figcaption>
    </figure>
  );
}
