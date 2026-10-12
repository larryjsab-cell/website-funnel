import Link from "next/link";
import { site } from "@/lib/site";
import { ui } from "@/lib/content";

type Props = { onInk?: boolean };

/** Text wordmark until a logo file is supplied (see TODO.md). */
export function Wordmark({ onInk = false }: Props) {
  return (
    <Link
      href="/"
      aria-label={ui.nav.homeLabel}
      className={`inline-flex min-h-11 min-w-11 items-center gap-2 font-mono ${onInk ? "text-on-ink" : "text-ink"}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 items-center justify-center text-lg font-heavy mono-condensed ${
          onInk ? "bg-on-ink text-ink" : "bg-ink text-on-ink"
        }`}
      >
        {site.business.shortName.charAt(0)}
      </span>
      <span translate="no" className="hidden text-lg font-heavy tracking-snug mono-condensed xs:inline">
        {site.business.shortName}
        <span className="hidden font-normal xl:inline"> {site.business.name.replace(site.business.shortName, "").trim()}</span>
      </span>
    </Link>
  );
}
