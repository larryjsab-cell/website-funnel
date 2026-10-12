"use client";

import { useEffect, useState } from "react";
import { CtaButton } from "@/components/ui/CtaButton";
import ui from "@/content/ui.json";

/**
 * Always-reachable demo CTA under md. It stays out of the way while the hero's
 * own CTA ([data-cta-bar-after]) is on screen, so a phone never shows two at
 * once, and slides away while a form section ([data-hide-cta-bar]) is on
 * screen so it never covers fields.
 */
export function MobileCtaBar() {
  // Starts hidden: the hero CTA is on screen at load.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const visible = new Set<Element>();
    const watch = (selector: string, rootMargin: string) => {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) visible.add(e.target);
            else visible.delete(e.target);
          }
          setHidden(visible.size > 0);
        },
        { rootMargin },
      );
      document.querySelectorAll(selector).forEach((t) => io.observe(t));
      return io;
    };
    // The hero CTA counts as "on screen" until it has scrolled above the top (the huge bottom
    // margin covers anything below the fold), so short landscape screens never show the
    // bar and the header together at the top of the page.
    const observers = [watch("[data-cta-bar-after]", "0px 0px 100000px 0px"), watch("[data-hide-cta-bar]", "0px 0px -15% 0px")];
    // Pages without a hero CTA (legal pages) show the bar after first paint.
    const raf = document.querySelector("[data-cta-bar-after]") ? 0 : requestAnimationFrame(() => setHidden(false));
    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((io) => io.disconnect());
    };
  }, []);

  return (
    <aside
      aria-label={ui.mobileBarLabel}
      inert={hidden}
      className={`rz-mobile-bar fixed inset-x-0 bottom-0 z-bar border-t-2 border-ink bg-canvas pb-[calc(0.5rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-2 transition-transform duration-base ease-out md:hidden ${
        hidden ? "translate-y-full" : ""
      }`}
    >
      <CtaButton location="sticky_mobile_bar" fullWidth className="short:min-h-11" />
    </aside>
  );
}
