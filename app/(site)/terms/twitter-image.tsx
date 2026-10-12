import { legal } from "@/lib/content";
import { renderOg } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = `${legal.terms.title}: ${site.business.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderOg({ kicker: "Terms of service", title: "Pricing, cancellation, ownership and edits, in plain English." });
}
