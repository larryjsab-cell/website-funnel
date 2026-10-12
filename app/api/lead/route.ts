import { NextResponse } from "next/server";
import { checkAll, contactFields, demoFields, HONEYPOT, limits, type FormType } from "@/lib/forms";
import { isPlaceholder, site } from "@/lib/site";

/**
 * Validates a form submission and forwards it to the n8n webhook.
 * The webhook URL stays server-side (N8N_WEBHOOK_URL, else site.config).
 */
function webhookUrl(): string | null {
  const fromEnv = process.env.N8N_WEBHOOK_URL;
  if (fromEnv) return fromEnv;
  return isPlaceholder(site.site.formWebhookUrl) ? null : site.site.formWebhookUrl;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Bots fill the hidden field. Pretend success, send nothing.
  if (typeof body[HONEYPOT] === "string" && body[HONEYPOT]) {
    return NextResponse.json({ ok: true });
  }

  const formType = body.form_type as FormType;
  if (formType !== "demo" && formType !== "contact") {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const fields = formType === "demo" ? demoFields : contactFields;
  const data: Record<string, string> = {};
  for (const f of fields) {
    const v = body[f];
    data[f] = typeof v === "string" ? v.trim().slice(0, limits[f] ?? 500) : "";
  }

  const errors = checkAll(fields, data);
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "validation", fields: errors }, { status: 422 });
  }

  const url = webhookUrl();
  if (!url) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "/";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_type: formType,
        page,
        submitted_at: new Date().toISOString(),
        ...data,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
