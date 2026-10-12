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
    `inline-flex items-center justify-center rounded-ui border-2 text-center font-display font-bold ${size === "sm" ? "display-ui ui-condensed" : "display-ui"} ` +
    "transition-button duration-fast ease-out";

  const look = isPrimary
    ? onInk
      ? "border-on-band bg-cta text-on-cta shadow-hard-inverse hover:-translate-x-lift-x hover:-translate-y-lift-y hover:shadow-hard-inverse-lg active:translate-x-lift-x active:translate-y-lift-y active:shadow-none"
      : "border-ink bg-cta text-on-cta shadow-hard hover:-translate-x-lift-x hover:-translate-y-lift-y hover:shadow-hard-lg active:translate-x-lift-x active:translate-y-lift-y active:shadow-none"
    : onInk
      ? "border-on-band bg-transparent text-on-band hover:bg-on-band hover:text-band"
      : "border-ink bg-transparent text-ink hover:bg-ink hover:text-on-ink";

  return (
    <Link
      href={target}
      data-cta={location}
      className={`rz-btn rz-btn-${variant} rz-btn-${size} ${base} ${look} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {text}
    </Link>
  );
}
