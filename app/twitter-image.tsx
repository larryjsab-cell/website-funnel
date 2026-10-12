import { renderOg } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = `${site.business.name}: websites from $40/month, $0 design fee, free demo`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Home Twitter/X card image (same artwork as the Open Graph image). */
export default function TwitterImage() {
  return renderOg({ title: site.business.tagline });
}
