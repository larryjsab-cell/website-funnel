import { NextResponse } from "next/server";
import { affiliatesEnabled, applyAffiliate } from "@/lib/affiliate";
import { AFFILIATE_FIELDS, checkAffiliate, type AffiliateField } from "@/lib/affiliateForm";
import { HONEYPOT } from "@/lib/forms";
import { originOf } from "@/lib/server/origin";

/**
 * Affiliate program applications (the form on /affiliates). Saves the applicant through a
 * public database function (ryzon_landing_affiliate_apply), which queues a confirmation
 * for them and an alert for the owner. With JavaScript off the form posts here as a normal
 * HTML form and gets a redirect to /affiliates/thanks instead of JSON.
 */
export async function POST(request: Request) {
  if (!affiliatesEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const html = !(request.headers.get("content-type") ?? "").includes("application/json");
  let body: Record<string, unknown>;
  try {
    body = html ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const done = () =>
    html ? NextResponse.redirect(`${originOf(request)}/affiliates/thanks`, 303) : NextResponse.json({ ok: true });
  // Bots fill the hidden field. Pretend success, save nothing.
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT]) return done();

  const data = {} as Record<AffiliateField, string>;
  for (const f of AFFILIATE_FIELDS) data[f] = typeof body[f] === "string" ? (body[f] as string).trim() : "";
  const errors = checkAffiliate(data);
  if (Object.keys(errors).length) {
    return html
      ? NextResponse.redirect(`${originOf(request)}/affiliates/thanks?error=validation`, 303)
      : NextResponse.json({ error: "validation", fields: errors }, { status: 422 });
  }

  try {
    await applyAffiliate({
      name: data.name,
      email: data.email,
      phone: data.phone,
      business_name: data.business,
      website: data.website,
      audience: data.audience,
      promote_how: data.promote,
      notes: data.notes,
    });
  } catch (e) {
    console.error(`[affiliate] apply failed (${(e as Error).message})`);
    return html
      ? NextResponse.redirect(`${originOf(request)}/affiliates/thanks?error=upstream`, 303)
      : NextResponse.json({ error: "upstream" }, { status: 502 });
  }
  return done();
}
