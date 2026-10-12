"use client";

import { useSyncExternalStore } from "react";
import { styles } from "@/lib/content";
import { currentStyle, STYLE_EVENT } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener(STYLE_EVENT, onChange);
  return () => window.removeEventListener(STYLE_EVENT, onChange);
}

/** The page's live style (from <html data-theme>), default on the server. */
export function useActiveStyle(): string {
  return useSyncExternalStore(subscribe, currentStyle, () => styles.defaultId);
}
