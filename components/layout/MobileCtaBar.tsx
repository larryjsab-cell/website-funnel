import { CtaButton } from "@/components/ui/CtaButton";

/** Always-reachable demo CTA under md. Not rendered on /demo routes. */
export function MobileCtaBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-bar border-t-2 border-ink bg-canvas px-4 py-3 md:hidden">
      <CtaButton location="sticky_mobile_bar" fullWidth />
    </div>
  );
}
