import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

export type SectionTone = "canvas" | "surface" | "ink";

const tones: Record<SectionTone, string> = {
  // canvas stays transparent so the background grid shows through
  canvas: "bg-transparent text-ink",
  surface: "bg-surface text-ink",
  ink: "bg-band text-on-band",
};

type Props = {
  id: string;
  tone?: SectionTone;
  children: ReactNode;
  className?: string;
  /** Pass false when the section has no visible heading with id `${id}-heading`. */
  labelled?: boolean;
  /** "none" for flush bands like the trust strip. */
  padding?: "default" | "none";
};

export function Section({ id, tone = "canvas", children, className = "", labelled = true, padding = "default" }: Props) {
  return (
    <section
      id={id}
      aria-labelledby={labelled ? `${id}-heading` : undefined}
      className={`relative border-t-2 border-ink ${padding === "default" ? "py-16 md:py-24" : ""} ${tones[tone]} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
