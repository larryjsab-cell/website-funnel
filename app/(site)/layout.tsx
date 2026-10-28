import { AffiliateCapture } from "@/components/layout/AffiliateCapture";
import { MobileCtaBar } from "@/components/layout/MobileCtaBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { affiliatesEnabled } from "@/lib/affiliate";

/** Full sales layout: sticky nav, footer, sticky mobile CTA bar. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 md:pb-0">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="relative z-content">
        {children}
      </main>
      <SiteFooter />
      <MobileCtaBar />
      {affiliatesEnabled() && <AffiliateCapture />}
    </div>
  );
}
