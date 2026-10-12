"use client";

import { useEffect, useRef, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Container } from "@/components/ui/Container";
import { track } from "@/lib/analytics";
import styles from "@/content/styles.json";
import { applyStyle } from "@/lib/theme";
import { useActiveStyle } from "@/lib/useActiveStyle";

/**
 * Restyles the entire page in place. Each option is a live mini-preview:
 * the card sets its own data-theme, so it shows that style's real tokens.
 * Native radios give arrow-key navigation and screen reader semantics.
 */
export function StyleSwitcher() {
  const applied = useActiveStyle();
  const [pending, setPending] = useState<string | null>(null);
  const active = pending ?? applied;

  // Each preview uses its style's own fonts. Attach those styles only when the section
  // is near the screen, so the other six font families don't compete with the hero.
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mark the choice right away, then restyle the page in the next task, after that
  // paint: re-theming the whole page is heavy, and the click shouldn't wait for it.
  function choose(id: string) {
    setPending(id);
    requestAnimationFrame(() =>
      setTimeout(() => {
        applyStyle(id);
        setPending(null);
        track({ name: "style_select", style: id });
      }, 0),
    );
  }

  const activeName = styles.options.find((o) => o.id === active)?.name;

  return (
    <section ref={sectionRef} id="styles" aria-labelledby="styles-heading" className="rz-section rz-tone-canvas relative border-t-2 border-ink py-16 md:py-24">
      <Container>
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Heading id="styles-heading">{styles.heading}</Heading>
            <p className="mt-4 max-w-measure text-lg">{styles.intro}</p>
          </div>
          <p aria-live="polite" className="font-display text-lg font-bold display-ui lg:col-span-4 lg:text-right">
            {styles.current}: {activeName}
          </p>
        </div>

        <fieldset className="mt-10">
          <legend className="sr-only">{styles.groupLabel}</legend>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-7">
            {styles.options.map((o) => (
              <label
                key={o.id}
                className="group relative flex cursor-pointer flex-col overflow-hidden rounded-card border-2 border-ink bg-surface transition-button duration-fast has-[:checked]:shadow-hard-lg has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  id={`site-style-${o.id}`}
                  name="site-style"
                  value={o.id}
                  checked={active === o.id}
                  onChange={() => choose(o.id)}
                  className="sr-only"
                />
                {/* Scoped live preview of this style's real tokens */}
                <span
                  aria-hidden="true"
                  data-theme={near || o.id === active ? o.id : undefined}
                  className="flex flex-col gap-3 border-b-2 border-ink bg-canvas p-3 text-ink"
                >
                  <span className="font-display text-4xl font-heavy leading-none tracking-tight display-tight">
                    {styles.previewText}
                  </span>
                  <span className="flex min-h-8 items-center justify-center whitespace-nowrap rounded-ui border-2 border-ink bg-cta px-2 font-display text-sm font-bold text-on-cta display-ui">
                    {styles.previewButton}
                  </span>
                  <span className="flex h-2 overflow-hidden rounded-ui">
                    <span className="flex-1 bg-ink" />
                    <span className="flex-1 bg-accent" />
                    <span className="flex-1 bg-band" />
                    <span className="flex-1 bg-surface" />
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-3">
                  <span className="font-display text-base font-bold display-ui">{o.name}</span>
                  <span className="mt-1 text-sm text-muted">{o.desc}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 hidden rounded-ui border-2 border-ink bg-surface px-2 font-display text-sm font-bold display-ui group-has-[:checked]:block"
                >
                  ✓
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-6 max-w-measure text-base text-muted">{styles.note}</p>
      </Container>
    </section>
  );
}
