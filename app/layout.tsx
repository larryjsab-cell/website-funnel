import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Bodoni_Moda,
  Bricolage_Grotesque,
  Cormorant_Garamond,
  Fraunces,
  Instrument_Sans,
  Jost,
  Karla,
  Libre_Franklin,
  Martian_Mono,
  Nunito,
  Public_Sans,
} from "next/font/google";
import "./globals.css";
import { AnalyticsListener } from "@/components/layout/AnalyticsListener";
import { GridBackdrop } from "@/components/layout/GridBackdrop";
import { SkipLink } from "@/components/layout/SkipLink";
import { site, siteUrl } from "@/lib/site";
import { landing } from "@/lib/content";
import { themeBootScript } from "@/lib/theme";

// next/font needs each loader assigned to a module-level const.
// Brutalist (default style) fonts are preloaded; the other six styles' fonts
// download only when a visitor switches to that style.
const martian = Martian_Mono({ subsets: ["latin"], axes: ["wdth"], variable: "--font-martian", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap", preload: false });
const bodoni = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", display: "swap", preload: false });
const franklin = Libre_Franklin({ subsets: ["latin"], variable: "--font-franklin", display: "swap", preload: false });
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});
const karla = Karla({ subsets: ["latin"], variable: "--font-karla", display: "swap", preload: false });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public", display: "swap", preload: false });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap", preload: false });

const fonts = [martian, archivo, instrument, bodoni, franklin, fraunces, karla, publicSans, cormorant, jost, bricolage, nunito];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: landing.meta.title,
    template: `%s | ${site.business.name}`,
  },
  description: landing.meta.description,
  applicationName: site.business.name,
  openGraph: {
    type: "website",
    siteName: site.business.name,
    locale: site.site.locale,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: site.colors.concrete,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={fonts.map((f) => f.variable).join(" ")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SkipLink />
        <GridBackdrop />
        {children}
        <AnalyticsListener />
      </body>
    </html>
  );
}
