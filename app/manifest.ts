import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.business.name,
    short_name: site.business.shortName,
    description: site.business.tagline,
    start_url: "/",
    display: "browser",
    background_color: site.colors.concrete,
    theme_color: site.colors.concrete,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
