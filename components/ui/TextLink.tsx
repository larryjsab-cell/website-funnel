import Link from "next/link";
import type { ReactNode } from "react";

type Props = { href: string; children: ReactNode; onInk?: boolean; className?: string };

/** Descriptive inline link. Underlined always; never "click here". */
export function TextLink({ href, children, onInk = false, className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center font-mono font-bold underline decoration-2 underline-offset-4 transition-colors duration-fast ${
        onInk ? "text-on-ink hover:decoration-4" : "text-ink hover:text-accent"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
