"use client";

import { usePathname } from "next/navigation";

const columns = Array.from({ length: 12 }, (_, i) => i);

/** The visible column grid behind transparent (canvas) sections. Off on the blog, where lines behind long text hurt reading. */
export function GridBackdrop() {
  const pathname = usePathname();
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return null;
  return (
    <div aria-hidden="true" className="grid-backdrop pointer-events-none fixed inset-0 z-grid">
      <div className="mx-auto grid h-full w-full max-w-page grid-cols-4 px-4 md:px-8 lg:grid-cols-12">
        {columns.map((i) => (
          <div
            key={i}
            className={`border-l border-grid ${i === 3 ? "border-r lg:border-r-0" : ""} ${i === 11 ? "lg:border-r" : ""} ${
              i > 3 ? "hidden lg:block" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
