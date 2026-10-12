import Link from "next/link";
import { site } from "@/lib/site";
import { ui } from "@/lib/content";

type Props = { onInk?: boolean };

/** Text wordmark until a logo file is supplied (see TODO.md). */
export function Wordmark({ onInk = false }: Props) {
  return (
    <Link
      href="/"
      className={`rz-wordmark inline-flex min-h-11 min-w-11 items-center gap-2 font-display ${onInk ? "text-on-band" : "text-ink"}`}
    >
      <span
        aria-hidden="true"
        className={`rz-logo-mark flex h-8 w-8 items-center justify-center rounded-ui text-lg font-heavy display-tight ${
          onInk ? "bg-on-band text-band" : "bg-ink text-on-ink"
        }`}
      >
        {site.business.shortName.charAt(0)}
      </span>
      {/* The accessible name is always the full "Ryzon Automation home", and it contains
          whatever part of the wordmark is visible at this width. */}
      <span translate="no" className="sr-only text-lg font-heavy tracking-snug display-tight xs:not-sr-only">
        {site.business.shortName}
        <span className="sr-only font-normal xl:not-sr-only"> {site.business.name.replace(site.business.shortName, "").trim()}</span>
      </span>
      <span className="sr-only"> {ui.nav.homeLabel.replace(site.business.name, "").trim()}</span>
    </Link>
  );
}
