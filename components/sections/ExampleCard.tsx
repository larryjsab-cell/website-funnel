import Link from "next/link";
import { Placeholder } from "@/components/ui/Placeholder";
import { site } from "@/lib/site";
import type { ExampleItem } from "@/lib/content";

type Props = { item: ExampleItem; ctaLabel: string };

/** Each example ends in the demo: the whole card links to #demo and pre-selects the industry. */
export function ExampleCard({ item, ctaLabel }: Props) {
  return (
    <article id={`example-${item.id}`} className="rz-card rz-example group relative flex overflow-hidden rounded-card border-2 border-ink bg-surface xs:flex-col">
      {/* Under 375px the card turns sideways (image left) so titles get a readable width. */}
      <Placeholder prompt={item.prompt} alt={item.alt} aspect="4/3" className="w-2/5 shrink-0 self-start xs:w-full" />
      <div className="flex min-w-0 flex-1 flex-col border-l-2 border-ink p-3 xs:border-l-0 xs:border-t-2 md:p-4">
        <h3 className="break-words font-display text-lg font-heavy display-tight">{item.title}</h3>
        <Link
          href={site.cta.primary.href}
          prefetch={false}
          data-cta={`example_${item.id}`}
          data-industry={item.formIndustry}
          className="mt-auto inline-flex min-h-11 items-center pt-2 font-display text-sm font-bold underline decoration-2 underline-offset-4 display-ui after:absolute after:inset-0 group-hover:text-accent"
        >
          {ctaLabel}
          <span className="sr-only">: {item.title}</span>
        </Link>
      </div>
    </article>
  );
}
