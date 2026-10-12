import Link from "next/link";
import type { ReactNode } from "react";

type Props = { href: string; children: ReactNode; onInk?: boolean; className?: string };

/** Descriptive inline link. Underlined always; never "click here". */
export function TextLink({ href, children, onInk = false, className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`rz-link inline-flex min-h-11 items-center font-display font-bold underline decoration-2 underline-offset-4 transition-colors duration-fast ${
        onInk ? "text-on-band hover:decoration-4" : "text-ink hover:text-accent"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
