import { SlimHeader } from "@/components/layout/SlimHeader";

/** Demo flow: logo only, no footer clutter, no sticky bar. */
export default function SlimLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SlimHeader />
      <main id="main" tabIndex={-1} className="relative z-content">
        {children}
      </main>
    </>
  );
}
