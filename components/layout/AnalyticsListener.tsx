"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * One delegated listener reports every [data-cta] click, so CTA links stay
 * server-rendered with no client JS of their own.
 */
export function AnalyticsListener() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-cta]");
      if (!el) return;
      track({
        name: "cta_click",
        location: el.dataset.cta ?? "unknown",
        label: el.textContent?.trim() ?? undefined,
        href: el.getAttribute("href") ?? undefined,
      });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
