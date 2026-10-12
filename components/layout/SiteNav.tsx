"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { NavItem } from "@/lib/site";

type Props = {
  items: NavItem[];
  labels: { label: string; openMenu: string; closeMenu: string; menu: string; close: string };
  /** Server-rendered extras shown at the bottom of the mobile drawer. */
  drawerFooter: ReactNode;
};

export function SiteNav({ items, labels, drawerFooter }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Close on navigate: drop the open state when the route changes.
  if (open && openedAt !== pathname) setOpen(false);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !panelRef.current || !buttonRef.current) return;
      // Keep focus inside the toggle + open drawer; the page behind is covered.
      const focusables = [
        buttonRef.current,
        ...panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onResize = () => mq.matches && close(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    document.documentElement.classList.add("overflow-hidden");
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
      document.documentElement.classList.remove("overflow-hidden");
    };
  }, [open, close]);

  return (
    <>
      <nav aria-label={labels.label} className="hidden lg:block">
        <ul className="flex items-center gap-1 xl:gap-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rz-nav-link flex min-h-11 items-center px-2 font-display text-sm font-medium underline-offset-4 transition-colors duration-fast display-ui hover:text-accent hover:underline hover:decoration-2 xl:px-3"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? labels.closeMenu : labels.openMenu}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((v) => !v);
        }}
        className="rz-menu-btn flex min-h-11 min-w-11 items-center justify-center rounded-ui border-2 border-ink px-2 font-display text-sm font-bold display-ui lg:hidden"
      >
        <span aria-hidden="true">{open ? labels.close : labels.menu}</span>
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="rz-drawer fixed inset-x-0 bottom-0 top-16 z-drawer overflow-y-auto overscroll-contain border-t-2 border-ink bg-canvas lg:hidden"
      >
        <nav aria-label={labels.label} className="px-4 py-6">
          <ul className="border-t-2 border-ink">
            {items.map((item) => (
              <li key={item.href} className="border-b-2 border-ink">
                <Link
                  href={item.href}
                  onClick={() => close(false)}
                  className="flex min-h-14 items-center font-display text-xl font-heavy display-tight"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">{drawerFooter}</div>
        </nav>
      </div>
    </>
  );
}
