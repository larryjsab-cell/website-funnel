import Link from "next/link";
import { Placeholder } from "@/components/ui/Placeholder";
import type { ExampleItem } from "@/lib/content";

type Props = { item: ExampleItem; href: string };

export function ExampleCard({ item, href }: Props) {
  return (
    <article className="group relative border-2 border-ink bg-surface">
      <Placeholder prompt={item.prompt} alt={item.alt} aspect="4/3" />
      <div className="border-t-2 border-ink p-4">
        <h3 className="font-mono text-lg font-heavy mono-condensed">
          <Link href={href} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
            {item.title}
          </Link>
        </h3>
        <p className="mt-1 text-base text-muted">{item.industry}</p>
      </div>
    </article>
  );
}
