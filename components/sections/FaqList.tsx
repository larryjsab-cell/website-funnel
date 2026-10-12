import type { FaqItem } from "@/lib/content";

type Props = { items: FaqItem[]; headingLevel?: "h3" | "h4" };

/** Native <details>: accessible, keyboard-operable, works without JS. */
export function FaqList({ items, headingLevel: H = "h3" }: Props) {
  return (
    <div className="border-t-2 border-ink">
      {items.map((item) => (
        <details key={item.id} id={`faq-${item.id}`} className="group border-b-2 border-ink">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 hover:text-accent">
            <H className="font-display text-lg font-bold display-ui">{item.q}</H>
            <span aria-hidden="true" className="faq-toggle font-display text-2xl font-bold leading-none">
              +
            </span>
          </summary>
          <p className="max-w-measure pb-6 text-base">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
