import { NextResponse } from "next/server";
import { originOf } from "@/lib/server/origin";
import { lookupReview, PLATFORMS, REVIEW_TOKEN, reviewRpc, type Platform } from "@/lib/review";

/** "Post it on Google" and friends: notes which platform they chose, then sends them there. */
export async function GET(request: Request) {
  const origin = originOf(request);
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  const platform = url.searchParams.get("p") as Platform;
  if (!REVIEW_TOKEN.test(token) || !(platform in PLATFORMS)) return NextResponse.redirect(`${origin}/review?error=1`, 303);
  try {
    const state = await lookupReview(token);
    const target = state?.links?.[platform];
    if (!target) return NextResponse.redirect(`${origin}/review?t=${token}`, 303);
    await reviewRpc("ryzon_landing_review_clicked", { p_token: token, p_platform: platform }).catch(() => null);
    return NextResponse.redirect(target, 303);
  } catch {
    return NextResponse.redirect(`${origin}/review?t=${token}&error=1`, 303);
  }
}
