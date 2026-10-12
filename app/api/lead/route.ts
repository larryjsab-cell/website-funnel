import { NextResponse } from "next/server";
import { checkAll, contactFields, demoFields, HONEYPOT, limits, type FieldErrorKind, type FormType } from "@/lib/forms";
import { edge, edgeConfigured, EdgeError } from "@/lib/server/edge";
import { originOf } from "@/lib/server/origin";

/**
 * Validates a form submission and saves it to Supabase (ryzon_landing_submissions).
 * Saving queues the confirmation and alert emails; the database tells n8n to send them.
 *
 * The site's forms send JSON. With JavaScript off they post as a normal HTML form,
 * and get a redirect to /thank-you, which shows the result, instead of JSON.
 */
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

type Outcome = { error?: "invalid" | "validation" | "not_configured" | "upstream"; fields?: Record<string, FieldErrorKind> };
const STATUS = { invalid: 400, validation: 422, not_configured: 503, upstream: 502 } as const;

export async function POST(request: Request) {
  const html = !(request.headers.get("content-type") ?? "").includes("application/json");
  let body: Record<string, unknown>;
  try {
    body = html ? Object.fromEntries((await request.formData()).entries()) : await request.json();
  } catch {
    return reply(request, html, "", { error: "invalid" });
  }
  const formType = body.form_type as FormType;
  return reply(request, html, formType, await handle(body, formType));
}

function reply(request: Request, html: boolean, formType: string, { error, fields }: Outcome) {
  if (!html) return error ? NextResponse.json({ error, fields }, { status: STATUS[error] }) : NextResponse.json({ ok: true });
  const q = new URLSearchParams({ form: formType === "contact" ? "contact" : "demo" });
  if (error) q.set("error", error);
  if (fields) q.set("fields", Object.entries(fields).map(([f, kind]) => `${f}:${kind}`).join(","));
  return NextResponse.redirect(`${originOf(request)}/thank-you?${q}`, 303);
}

async function handle(body: Record<string, unknown>, formType: FormType): Promise<Outcome> {
  // Bots fill the hidden field. Pretend success, save nothing.
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT]) return {};
  if (formType !== "demo" && formType !== "contact") return { error: "invalid" };

  const fields = formType === "demo" ? demoFields : contactFields;
  const data: Record<string, string> = {};
  for (const f of fields) data[f] = text(body[f], limits[f] ?? 500);

  const errors = checkAll(fields, data) as Record<string, FieldErrorKind>;
  if (Object.keys(errors).length) return { error: "validation", fields: errors };
  if (!edgeConfigured()) return { error: "not_configured" };

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
    return { error: e instanceof EdgeError && e.status === 503 ? "not_configured" : "upstream" };
  }
  return {};
}
