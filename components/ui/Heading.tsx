import type { ReactNode } from "react";

type Size = "section" | "display" | "card";

const sizes: Record<Size, string> = {
  display: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
  section: "text-2xl sm:text-3xl md:text-4xl",
  card: "text-xl",
};

type Props = {
  as?: "h1" | "h2" | "h3";
  id?: string;
  size?: Size;
  children: ReactNode;
  className?: string;
};

/** Martian Mono, condensed, heavy. The voice of the site. */
export function Heading({ as: Tag = "h2", id, size = "section", children, className = "" }: Props) {
  return (
    <Tag
      id={id}
      className={`font-display font-heavy tracking-snug text-balance display-tight ${sizes[size]} ${className}`}
    >
      {children}
    </Tag>
  );
}
