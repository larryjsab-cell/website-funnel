import Link from "next/link";
import { site } from "@/lib/site";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

type Props = {
  /** Where on the page this CTA sits. Sent with every cta_click event. */
  location: string;
  label?: string;
  href?: string;
  variant?: Variant;
  size?: Size;
  /** Set when the button sits on the ink band. */
  onInk?: boolean;
  fullWidth?: boolean;
  className?: string;
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 whitespace-nowrap px-3 text-sm",
  md: "min-h-12 px-6 text-sm",
  lg: "min-h-14 px-8 text-lg",
};

/**
 * The one CTA component. Primary goes to /demo by default and is the only
 * element on the site allowed to use the cta color.
 */
export function CtaButton({
  location,
  label,
  href,
  variant = "primary",
  size = "md",
  onInk = false,
  fullWidth = false,
  className = "",
}: Props) {
  const isPrimary = variant === "primary";
  const text = label ?? (isPrimary ? site.cta.primary.label : site.cta.secondary.label);
  const target = href ?? (isPrimary ? site.cta.primary.href : site.cta.secondary.href);

  const base =
    `inline-flex items-center justify-center border-2 text-center font-mono font-bold ${size === "sm" ? "mono-condensed" : "mono-semi"} ` +
    "transition-button duration-fast ease-out";

  const look = isPrimary
    ? onInk
      ? "border-on-ink bg-cta text-ink shadow-hard-inverse hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-inverse-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
      : "border-ink bg-cta text-ink shadow-hard hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
    : onInk
      ? "border-on-ink bg-transparent text-on-ink hover:bg-on-ink hover:text-ink"
      : "border-ink bg-transparent text-ink hover:bg-ink hover:text-on-ink";

  return (
    <Link
      href={target}
      data-cta={location}
      className={`${base} ${look} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {text}
    </Link>
  );
}
