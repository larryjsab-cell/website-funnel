"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False in the server HTML and during hydration, true once React runs in the browser. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
