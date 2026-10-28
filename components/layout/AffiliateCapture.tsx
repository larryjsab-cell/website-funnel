"use client";

import { useEffect } from "react";

/**
 * Picks up ?aff=<code> on any page: hands the code to the server, which keeps it in cookies
 * (lib/affiliate.ts), then removes it from the address bar so it isn't shared onward.
 * Only rendered while the affiliate program is on.
 */
export function AffiliateCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("aff");
    if (!code) return;
    url.searchParams.delete("aff");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    void fetch("/api/affiliate/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, path: url.pathname, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {});
  }, []);
  return null;
}
