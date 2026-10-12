import { CtaButton } from "@/components/ui/CtaButton";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { HeaderAutoHide } from "@/components/layout/HeaderAutoHide";
import { SiteNav } from "@/components/layout/SiteNav";
import { site } from "@/lib/site";
import { ui } from "@/lib/content";

export function SiteHeader() {
  return (
    <header className="rz-header sticky top-0 z-header border-b-2 border-ink bg-canvas">
      <HeaderAutoHide />
      <Container className="flex h-14 items-center justify-between gap-3 md:h-16">
        <Wordmark />
        <div className="flex items-center gap-2 lg:gap-4">
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
          <CtaButton location="header" size="sm" className="max-md:hidden md:min-h-12 md:px-4" />
        </div>
      </Container>
    </header>
  );
}
