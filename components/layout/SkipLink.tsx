import { ui } from "@/lib/content";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-drawer rounded-ui border-2 border-ink bg-surface px-4 py-3 font-display font-bold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      {ui.skipLink}
    </a>
  );
}
