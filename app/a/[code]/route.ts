import { NextResponse, type NextRequest } from "next/server";
import { affiliatesEnabled, track } from "@/lib/affiliate";
import { originOf } from "@/lib/server/origin";

/**
 * Affiliate links: /a/<code>. Logs the click, keeps the code in cookies for the program's
 * window (lib/affiliate.ts), then sends the visitor to the home page, or to ?to=/some/page.
 * Any other query (utm_*) is carried over. With the program off it simply goes home.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = originOf(request);
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? "/";
  const dest = new URL(/^\/(?!\/)[^\s\\]*$/.test(to) ? to : "/", origin);
  url.searchParams.forEach((v, k) => {
    if (k !== "to" && k !== "aff") dest.searchParams.set(k, v);
  });

  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex");
  if (!affiliatesEnabled()) return res;

  await track(
    (n) => request.cookies.get(n)?.value,
    (n, v, o) => res.cookies.set(n, v, o),
    code,
    dest.pathname,
    request.headers.get("referer"),
    origin.startsWith("https:"),
  );
  return res;
}
