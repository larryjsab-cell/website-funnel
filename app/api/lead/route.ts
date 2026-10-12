import { NextResponse } from "next/server";
import { checkAll, contactFields, demoFields, HONEYPOT, limits, type FormType } from "@/lib/forms";
import { edge, edgeConfigured, EdgeError } from "@/lib/server/edge";

/**
 * Validates a form submission and saves it to Supabase (ryzon_landing_submissions).
 * Saving queues the confirmation and alert emails; the database tells n8n to send them.
 */
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Bots fill the hidden field. Pretend success, save nothing.
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT]) {
    return NextResponse.json({ ok: true });
  }

  const formType = body.form_type as FormType;
  if (formType !== "demo" && formType !== "contact") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const fields = formType === "demo" ? demoFields : contactFields;
  const data: Record<string, string> = {};
  for (const f of fields) data[f] = text(body[f], limits[f] ?? 500);

  const errors = checkAll(fields, data);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "validation", fields: errors }, { status: 422 });
  }
  if (!edgeConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const submission = {
    form_type: formType,
    name: data.name,
    email: data.email,
    phone: data.phone,
    business_name: data.businessName,
    industry: data.industry,
    style: data.style,
    current_site: data.website,
    goals: data.notes,
    message: data.message,
    timezone: text(body.timezone, 64),
    source_page: text(body.page, 200) || "/",
    referrer: text(body.referrer, 500),
    utm_source: text(body.utm_source, 200),
    utm_medium: text(body.utm_medium, 200),
    utm_campaign: text(body.utm_campaign, 200),
    utm_term: text(body.utm_term, 200),
    utm_content: text(body.utm_content, 200),
    form_answers: { landing_page: text(body.landing_page, 300) },
  };

  try {
    await edge("submit", { data: submission });
  } catch (e) {
    const status = e instanceof EdgeError ? e.status : 502;
    return NextResponse.json({ error: status === 503 ? "not_configured" : "upstream" }, { status: status === 503 ? 503 : 502 });
  }
  return NextResponse.json({ ok: true });
}
