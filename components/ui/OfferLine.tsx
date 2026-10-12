import { site } from "@/lib/site";
import { ui } from "@/lib/content";

type Props = { onInk?: boolean; className?: string };

/** $40/mo | $0 design fee | Free demo, as three ruled spec cells. */
export function OfferLine({ onInk = false, className = "" }: Props) {
  const border = onInk ? "border-on-band" : "border-ink";
  return (
    <ul
      aria-label={ui.offerLineLabel}
      className={`rz-offer-line grid grid-cols-3 overflow-hidden rounded-ui border-2 ${border} ${onInk ? "text-on-band" : "bg-surface text-ink"} ${className}`}
    >
      {site.offer.line.map((item, i) => (
        <li
          key={item}
          className={`rz-offer-cell flex items-center justify-center px-2 py-3 text-center font-display text-sm font-bold display-ui ui-condensed sm:text-lg ${
            i > 0 ? `border-l-2 ${border}` : ""
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
