import { NextResponse, type NextRequest } from "next/server";
import { affiliatesEnabled, track } from "@/lib/affiliate";
import { originOf } from "@/lib/server/origin";

/**
 * ?aff=<code> on any page. The page posts the code here (components/layout/AffiliateCapture.tsx)
 * and this sets the same cookies /a/<code> does. Same-origin only.
 */
export async function POST(request: NextRequest) {
  if (!affiliatesEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const origin = originOf(request);
  const from = request.headers.get("origin");
  if (from && from !== origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { code?: unknown; path?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  const ok = await track(
    (n) => request.cookies.get(n)?.value,
    (n, v, o) => res.cookies.set(n, v, o),
    body.code,
    typeof body.path === "string" ? body.path : "/",
    typeof body.referrer === "string" ? body.referrer : null,
    origin.startsWith("https:"),
  );
  return ok ? res : NextResponse.json({ ok: false });
}
