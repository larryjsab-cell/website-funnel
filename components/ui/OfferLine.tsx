import { site } from "@/lib/site";
import { ui } from "@/lib/content";

type Props = { onInk?: boolean; className?: string };

/** $40/mo | $0 design fee | Free demo, as three ruled spec cells. */
export function OfferLine({ onInk = false, className = "" }: Props) {
  const border = onInk ? "border-on-ink" : "border-ink";
  return (
    <ul
      aria-label={ui.offerLineLabel}
      className={`grid grid-cols-3 border-2 ${border} ${onInk ? "text-on-ink" : "bg-surface text-ink"} ${className}`}
    >
      {site.offer.line.map((item, i) => (
        <li
          key={item}
          className={`flex items-center justify-center px-2 py-3 text-center font-mono text-sm font-bold mono-condensed sm:text-lg ${
            i > 0 ? `border-l-2 ${border}` : ""
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
