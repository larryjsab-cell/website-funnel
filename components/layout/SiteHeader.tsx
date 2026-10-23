import { CtaButton } from "@/components/ui/CtaButton";
import { Wordmark } from "@/components/ui/Wordmark";
import { HeaderAutoHide } from "@/components/layout/HeaderAutoHide";
import { SiteNav } from "@/components/layout/SiteNav";
import { site } from "@/lib/site";
import { ui } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="rz-header sticky top-0 z-header border-b-2 border-ink bg-canvas">
      <HeaderAutoHide />
      {/* Full width; the wordmark and CTA never shrink, so the nav can't slide under them. */}
      <div className="flex h-14 w-full items-center justify-between gap-6 px-4 md:h-16 md:px-8">
        <Wordmark />
        <div className="flex min-w-0 items-center gap-2 lg:gap-4">
          <SiteNav
            items={site.nav}
            labels={ui.nav}
            drawerFooter={
              <div className="grid gap-4">
                <CtaButton location="nav_drawer" size="lg" fullWidth />
                <a href={site.business.phoneHref} className="inline-flex min-h-11 items-center font-display text-lg font-bold underline decoration-2 underline-offset-4">
                  {site.business.phone}
                </a>
              </div>
            }
          />
          <CtaButton location="header" size="sm" className="shrink-0 max-md:hidden md:min-h-12 md:px-4" />
        </div>
      </div>
    </header>
  );
}
