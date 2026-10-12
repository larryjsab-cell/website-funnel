import { legal } from "@/lib/content";
import { renderOg } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = `${legal.privacy.title}: ${site.business.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return renderOg({ kicker: "Privacy policy", title: "What we collect when you ask for a demo, and why." });
}
