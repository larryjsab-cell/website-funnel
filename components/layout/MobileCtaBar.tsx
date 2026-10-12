"use client";

import { useEffect, useState } from "react";
import { CtaButton } from "@/components/ui/CtaButton";

/**
 * Always-reachable demo CTA under md. Slides away while a form section
 * ([data-hide-cta-bar]) is on screen so it never covers fields.
 */
export function MobileCtaBar() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets = document.querySelectorAll("[data-hide-cta-bar]");
    if (!targets.length) return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setHidden(visible.size > 0);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div
      inert={hidden}
      className={`fixed inset-x-0 bottom-0 z-bar border-t-2 border-ink bg-canvas px-4 py-3 transition-transform duration-base ease-out md:hidden ${
        hidden ? "translate-y-full" : ""
      }`}
    >
      <CtaButton location="sticky_mobile_bar" fullWidth />
    </div>
  );
}
