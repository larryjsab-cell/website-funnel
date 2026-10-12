"use client";

import { useEffect } from "react";

/**
 * Phones and short landscape screens: the sticky header slides away while
 * reading down the page and comes back on any scroll up, so it isn't eating
 * a fifth of the screen. CSS (globals.css) does the hiding; this only flags it.
 */
export function HeaderAutoHide() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".rz-header");
    if (!header) return;
    let last = window.scrollY;
    // Deepest point reached since the last scroll up. The header only returns after a real
    // scroll up from there, not when late-loading content nudges the page by a few pixels.
    let deepest = last;
    let frame = 0;
    // Only a scroll the visitor makes (touch, wheel, keys) can bring the header back;
    // layout shifts from late fonts or images move scrollY too and must not.
    let lastInput = 0;
    const onInput = () => (lastInput = performance.now());
    const inputs = ["touchmove", "wheel", "keydown", "pointerdown"] as const;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const menuOpen = document.documentElement.classList.contains("overflow-hidden");
      const focused = header.contains(document.activeElement);
      if (y > last) deepest = Math.max(deepest, y);
      const userScroll = performance.now() - lastInput < 800;
      if (y < 120 || menuOpen || focused || (userScroll && deepest - y > 64)) {
        delete header.dataset.hidden;
        deepest = y;
      } else if (y > last) header.dataset.hidden = "";
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const reveal = () => delete header.dataset.hidden;
    window.addEventListener("scroll", onScroll, { passive: true });
    inputs.forEach((t) => window.addEventListener(t, onInput, { passive: true }));
    header.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      inputs.forEach((t) => window.removeEventListener(t, onInput));
      header.removeEventListener("focusin", reveal);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
