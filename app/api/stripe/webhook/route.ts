import { NextResponse } from "next/server";
import { recordSession, retrieveEvent, StripeError } from "@/lib/server/stripe";

/**
 * Backup for the success page: if a customer closes the tab after paying, Stripe
 * still tells us. The payload is not trusted: the event is fetched back from
 * Stripe by id with the secret key, which proves it is real. Recording is
 * idempotent on the checkout session id, so retries are harmless.
 */
const HANDLED = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { id?: string; type?: string } | null;
  if (!body?.id || !/^evt_\w+$/.test(body.id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (body.type && !HANDLED.has(body.type)) return NextResponse.json({ ignored: true });

  try {
    const event = await retrieveEvent(body.id);
    if (!HANDLED.has(event.type)) return NextResponse.json({ ignored: true });
    const result = await recordSession(event.data.object);
    return NextResponse.json(result);
  } catch (e) {
    // Stripe doesn't know this event: it didn't come from Stripe.
    if (e instanceof StripeError && e.status === 404) return NextResponse.json({ error: "unknown event" }, { status: 400 });
    console.error("stripe webhook failed", e);
    // 500 makes Stripe retry later.
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
