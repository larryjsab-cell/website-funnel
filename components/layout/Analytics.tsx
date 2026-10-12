import Script from "next/script";
import { analyticsEnabled, analyticsId } from "@/lib/analytics";

/**
 * GA4, loaded after the page is idle so it never blocks rendering or input.
 * Renders nothing until site.config.json has a real "G-…" measurement ID.
 * Events from lib/analytics.ts queue in window.dataLayer until it loads.
 */
export function Analytics() {
  if (!analyticsEnabled || !/^G-[A-Z0-9]+$/.test(analyticsId)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} strategy="lazyOnload" />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag("js",new Date());gtag("config","${analyticsId}");`}
      </Script>
    </>
  );
}
