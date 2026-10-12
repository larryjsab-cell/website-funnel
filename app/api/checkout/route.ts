import { NextResponse } from "next/server";
import { isOffer, tierById, type Interval } from "@/lib/offers";
import { edge } from "@/lib/server/edge";
import { originOf } from "@/lib/server/origin";
import { createCheckout } from "@/lib/server/stripe";

type Lookup = { found: boolean; id: string; email: string; paid: boolean; offer_active: boolean | null };

/**
 * The /go-live form posts here. Re-checks the offer is still active for this
 * customer, then sends them to Stripe Checkout with the token in the metadata.
 */
async function fields(request: Request): Promise<Record<string, string>> {
  // The page posts a plain form (works without JS); JSON is accepted for scripted checks.
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v ?? "")]));
  }
  const form = await request.formData().catch(() => new FormData());
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
}

export async function POST(request: Request) {
  const form = await fields(request);
  const token = (form.t ?? "").slice(0, 100);
  const offer = form.offer ?? "";
  const plan = form.plan ?? "";
  const intervalRaw = form.interval ?? "";
  const origin = originOf(request);
  const back = (error: string) =>
    NextResponse.redirect(`${origin}/go-live?t=${encodeURIComponent(token)}&offer=${encodeURIComponent(offer)}&error=${error}`, 303);

  if (!token || !isOffer(offer)) return back("invalid");
  const interval: Interval | "once" = offer === "files99" ? "once" : intervalRaw === "year" ? "year" : "month";
  if (offer === "files99" ? plan !== "files99" : !tierById(plan)) return back("invalid");

  try {
    const sub = await edge<Lookup>("lookup", { token, offer });
    // The page shows why (paid, expired, not started); just send them back to it.
    if (!sub.found || sub.paid || !sub.offer_active) return back("unavailable");
    const session = await createCheckout({ submissionId: sub.id, token, email: sub.email, offer, plan, interval, origin });
    return NextResponse.redirect(session.url, 303);
  } catch (e) {
    console.error("checkout failed", e);
    return back("checkout");
  }
}
