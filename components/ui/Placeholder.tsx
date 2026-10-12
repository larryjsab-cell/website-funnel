import { ui } from "@/lib/content";

type Aspect = "4/3" | "16/10" | "9/19" | "square";

const aspects: Record<Aspect, string> = {
  "4/3": "aspect-4/3",
  "16/10": "aspect-16/10",
  "9/19": "aspect-9/19",
  square: "aspect-square",
};

type Props = {
  /** Generation prompt for Phase 6: subject, composition, mood. */
  prompt: string;
  /** Final alt text for the real image. */
  alt: string;
  aspect?: Aspect;
  /** Show the "image to come" tag. Hide it in small slots. */
  showLabel?: boolean;
  /** Decorative slot inside an illustration (no alt exposed). */
  decorative?: boolean;
  priority?: "high" | "normal";
  className?: string;
};

/**
 * Typed image placeholder. Phase 6 finds every slot by [data-placeholder]
 * and replaces it with next/image using `prompt` and `alt`.
 */
export function Placeholder({
  prompt,
  alt,
  aspect = "4/3",
  showLabel = true,
  decorative = false,
  priority = "normal",
  className = "",
}: Props) {
  return (
    <div
      data-placeholder=""
      data-prompt={prompt}
      data-aspect={aspect}
      data-priority={priority}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      className={`relative overflow-hidden bg-canvas ${aspects[aspect]} ${className}`}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-rule"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {showLabel && (
        <span className="absolute bottom-2 left-2 bg-canvas px-2 font-mono text-sm text-muted">
          {ui.placeholder.label}
        </span>
      )}
    </div>
  );
}
