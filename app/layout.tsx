import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";
import { AnalyticsListener } from "@/components/layout/AnalyticsListener";
import { GridBackdrop } from "@/components/layout/GridBackdrop";
import { SkipLink } from "@/components/layout/SkipLink";
import { site, siteUrl } from "@/lib/site";
import { landing } from "@/lib/content";

const mono = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mono",
  display: "swap",
});

const sans = Archivo({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" data-scroll-behavior="smooth" className={`${mono.variable} ${sans.variable}`}>
      <body>
        <SkipLink />
        <GridBackdrop />
        {children}
        <AnalyticsListener />
      </body>
    </html>
  );
}
